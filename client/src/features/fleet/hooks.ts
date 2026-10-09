/**
 * React bindings for the fleet store: selector subscriptions, realtime
 * socket wiring, the snapshot loader and the derived connection badge.
 */
import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { getActiveSocket, onSocketCreated, type Socket } from "@/lib/socket";
import { TUser } from "@/interfaces/user";
import { useFleetService } from "@/services/fleet";
import {
  classifyFreshness,
  DEFAULT_THRESHOLDS,
} from "./freshness";
import { fleetActions, getFleetState, subscribeFleet, type FleetState } from "./store";
import type {
  BusLocationEvent,
  BusStatusEvent,
  ConnectionStatus,
  FleetBus,
  Freshness,
} from "./types";

// ---------------------------------------------------------------------------
// Store subscriptions
// ---------------------------------------------------------------------------

/**
 * Subscribes to a slice of the fleet store. The selector runs on every
 * notification, but the returned value keeps its identity while `isEqual`
 * holds — so a bus marker only re-renders when *that* bus changes.
 */
export function useFleetSelector<T>(
  selector: (state: FleetState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;
  const cacheRef = useRef<{ value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(getFleetState());
    const cached = cacheRef.current;
    if (cached && isEqualRef.current(cached.value, next)) return cached.value;
    cacheRef.current = { value: next };
    return next;
  }, []);

  return useSyncExternalStore(subscribeFleet, getSnapshot, getSnapshot);
}

/** The whole store — only for components that render many bus rows. */
export const useFleetState = (): FleetState => useFleetSelector((state) => state);

/** One bus, or `undefined` when it is outside this user's scope. */
export const useFleetBus = (busId: string | null | undefined): FleetBus | undefined =>
  useFleetSelector((state) => (busId ? state.buses[busId] : undefined));

/** Every bus in scope as an array sorted by bus number. */
export const useFleetBuses = (): FleetBus[] =>
  useFleetSelector(
    (state) => Object.values(state.buses).sort((a, b) => a.busNumber.localeCompare(b.busNumber)),
    (a, b) => a.length === b.length && a.every((bus, index) => bus === b[index])
  );

/** Freshness of one bus — recomputed whenever the store or the clock moves. */
export const useBusFreshness = (bus: FleetBus | undefined): Freshness => {
  useTicker(1000); // ages must keep advancing without new telemetry
  return useFleetSelector((state) =>
    classifyFreshness({
      lastLocationAt: bus?.lastLocationAt ?? null,
      meta: state.meta,
      clockOffset: state.clockOffset,
    })
  );
};

/** Re-renders on an interval so "3s ago" labels stay truthful. */
export const useTicker = (intervalMs = 1000): number => {
  const [tick, force] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    const id = window.setInterval(force, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
};

// ---------------------------------------------------------------------------
// Realtime socket
// ---------------------------------------------------------------------------

let boundSocket: Socket | null = null;

const onLocation = (payload: BusLocationEvent) => fleetActions.applyLocation(payload);
const onStatus = (payload: BusStatusEvent) => fleetActions.applyStatus(payload);
const onConnect = () => fleetActions.setSocketConnected(true);
const onDisconnect = () => fleetActions.setSocketConnected(false);

/** Binds the fleet listeners to a socket exactly once per connection. */
const bindFleetSocket = (socket: Socket) => {
  if (boundSocket === socket) return;
  if (boundSocket) {
    boundSocket.off("bus:location", onLocation);
    boundSocket.off("bus:status", onStatus);
    boundSocket.off("connect", onConnect);
    boundSocket.off("disconnect", onDisconnect);
  }
  boundSocket = socket;
  socket.on("bus:location", onLocation);
  socket.on("bus:status", onStatus);
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  fleetActions.setSocketConnected(socket.connected);
};

/**
 * Listens for `bus:location` / `bus:status` for the lifetime of the calling
 * component. Safe to call from several components — the binding is shared.
 */
export const useFleetRealtime = (): void => {
  useEffect(() => {
    const existing = getActiveSocket();
    if (existing) bindFleetSocket(existing);
    return onSocketCreated(bindFleetSocket);
  }, []);
};

// ---------------------------------------------------------------------------
// Derived connection state
// ---------------------------------------------------------------------------

export interface ConnectionView {
  status: ConnectionStatus;
  /** Age of the newest server payload, `null` when nothing arrived yet. */
  lastDataAge: number | null;
  hasData: boolean;
}

/**
 * LIVE requires an open socket *and* at least one payload from the server
 * (snapshot or telemetry) — a bare handshake never claims LIVE.
 */
export const useConnection = (): ConnectionView => {
  const socketConnected = useFleetSelector((state) => state.socketConnected);
  const snapshotAt = useFleetSelector((state) => state.snapshotAt);
  const lastMessageAt = useFleetSelector((state) => state.lastMessageAt);
  useTicker(1000);

  const newest = Math.max(snapshotAt ?? 0, lastMessageAt ?? 0);
  const hasData = newest > 0;

  const status: ConnectionStatus = !socketConnected
    ? "DISCONNECTED"
    : hasData
      ? "LIVE"
      : "CONNECTING";

  return {
    status,
    lastDataAge: hasData ? Math.max(0, Date.now() - newest) : null,
    hasData,
  };
};

/** Number of buses currently reporting a LIVE fix — drives the sidebar badge. */
export const useLiveBusCount = (): { count: number; hasData: boolean } => {
  const snapshotAt = useFleetSelector((state) => state.snapshotAt);
  const lastMessageAt = useFleetSelector((state) => state.lastMessageAt);
  useTicker(5000);

  const count = useFleetSelector((state) => {
    const freshSeconds = state.meta?.thresholds.freshSeconds ?? DEFAULT_THRESHOLDS.freshSeconds;
    return Object.values(state.buses).filter((bus) => {
      if (!bus.lastLocationAt) return false;
      const age = Date.now() + state.clockOffset - Date.parse(bus.lastLocationAt);
      return Number.isFinite(age) && age >= 0 && age < freshSeconds * 1000;
    }).length;
  });

  return { count, hasData: Boolean(snapshotAt ?? lastMessageAt) };
};

// ---------------------------------------------------------------------------
// Snapshot loading
// ---------------------------------------------------------------------------

/**
 * Loads the role-scoped fleet snapshot once and feeds it to the store.
 * Renders from the store afterwards — never from react-query — so realtime
 * events and the first frame share one source of truth.
 */
export const useFleetSnapshot = (): {
  isLoading: boolean;
  isError: boolean;
  reload: () => void;
} => {
  const { getFleetSnapshot } = useFleetService();
  const { data, error, isLoading, refetch } = getFleetSnapshot;
  const payloadRef = useRef<unknown>(undefined);

  useEffect(() => {
    if (!data || payloadRef.current === data) return;
    payloadRef.current = data;
    const envelope = data as {
      data?: { buses?: FleetBus[] } | FleetBus[] | FleetBus | null;
      meta?: FleetState["meta"];
    };

    const inner = envelope?.data;
    const buses = Array.isArray(inner)
      ? inner
      : inner && "buses" in inner
        ? (inner.buses ?? [])
        : inner
          ? [inner as FleetBus]
          : [];

    fleetActions.applySnapshot(buses, envelope?.meta ?? null);
  }, [data]);

  useEffect(() => {
    if (!error) return;
    if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 403) {
      const status = (error as { response?: { status?: number } } | null)?.response?.status;
      fleetActions.setError(status === 403 ? "fleet.errors.forbidden" : "fleet.errors.snapshot");
      return;
    }
    fleetActions.setError("fleet.errors.snapshot");
  }, [error]);

  const reload = useCallback(() => {
    fleetActions.setLoading();
    void refetch();
  }, [refetch]);

  return { isLoading, isError: Boolean(error), reload };
};

/** The signed-in user's role, or `undefined` outside the dashboard. */
export const useFleetRole = (): string | undefined => {
  const user = useAuthUser<TUser>() as TUser | null;
  return user?.role;
};
