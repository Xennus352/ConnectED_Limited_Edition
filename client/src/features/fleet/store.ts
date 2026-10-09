/**
 * A tiny external store for live fleet data.
 *
 * React Query is not used for the realtime layer on purpose: every
 * `bus:location` event must mutate exactly one bus so memoized markers,
 * stat cards and list rows re-render *only* when their own data changed.
 * `useFleetSelector` (see `hooks.ts`) gives components a stable, selector
 * based view of this store.
 *
 * The store is a module singleton: the sidebar badge, the fleet map and the
 * parent/driver pages all read the same state.
 */
import type {
  BusLocationEvent,
  BusStatusEvent,
  FleetBus,
  FleetLoadState,
  FleetMeta,
} from "./types";

export interface FleetState {
  /** `busId -> bus`, always a new object for the buses that changed. */
  buses: Record<string, FleetBus>;
  meta: FleetMeta | null;
  loadState: FleetLoadState;
  /** Never a raw backend message — always a translated, safe string key. */
  error: string | null;
  /** Epoch ms of the last realtime payload (any kind). */
  lastMessageAt: number | null;
  /** Epoch ms of the last successful snapshot request. */
  snapshotAt: number | null;
  /** Offset that converts the client clock into the server clock. */
  clockOffset: number;
  socketConnected: boolean;
  /** Bumped on every mutation so `useSyncExternalStore` notices changes. */
  version: number;
}

const initialState: FleetState = {
  buses: {},
  meta: null,
  loadState: "idle",
  error: null,
  lastMessageAt: null,
  snapshotAt: null,
  clockOffset: 0,
  socketConnected: false,
  version: 0,
};

let state: FleetState = initialState;
const listeners = new Set<() => void>();

const emit = () => {
  state = { ...state, version: state.version + 1 };
  for (const listener of listeners) listener();
};

/** Subscribes to fleet store changes (used by `useSyncExternalStore`). */
export const subscribeFleet = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getFleetState = (): FleetState => state;

const patch = (next: Partial<FleetState>) => {
  state = { ...state, ...next };
  emit();
};

export const fleetActions = {
  /** Resets everything — called when the signed-in user changes. */
  reset() {
    state = { ...initialState, socketConnected: state.socketConnected };
    emit();
  },

  setLoading() {
    patch({ loadState: "loading", error: null });
  },

  setError(key: string) {
    patch({ loadState: "error", error: key });
  },

  /**
   * Applies a snapshot. Buses keep their identity when unchanged so existing
   * markers are not torn down and rebuilt on every refetch.
   */
  applySnapshot(buses: FleetBus[], meta: FleetMeta | null) {
    const previous = state.buses;
    const next: Record<string, FleetBus> = {};
    for (const bus of buses) {
      const before = previous[bus.id];
      // Keep the newest of the snapshot value and any realtime fix that
      // arrived while the request was in flight.
      next[bus.id] = before && isNewer(before.lastLocationAt, bus.lastLocationAt)
        ? { ...bus, latitude: before.latitude, longitude: before.longitude,
            speed: before.speed, heading: before.heading,
            lastLocationAt: before.lastLocationAt, status: before.status }
        : bus;
    }

    state = {
      ...state,
      buses: next,
      meta: meta ?? state.meta,
      loadState: "ready",
      error: null,
      snapshotAt: Date.now(),
      clockOffset: meta ? Date.parse(meta.serverTime) - Date.now() : state.clockOffset,
    };
    emit();
  },

  /** Applies one `bus:location` event to exactly one bus. */
  applyLocation(event: BusLocationEvent) {
    const current = state.buses[event.busId];
    if (!current) {
      // A vehicle we never received a snapshot for (e.g. the driver page
      // before its own snapshot landed) — ignore rather than invent a row.
      return;
    }
    if (!isNewer(current.lastLocationAt, event.timestamp)) return; // out of order

    state = {
      ...state,
      buses: {
        ...state.buses,
        [event.busId]: {
          ...current,
          latitude: event.latitude,
          longitude: event.longitude,
          speed: event.speed,
          heading: event.heading,
          status: event.status,
          lastLocationAt: event.timestamp,
        },
      },
      lastMessageAt: Date.now(),
    };
    emit();
  },

  /** Applies one `bus:status` event (trip started/stopped, GPS flip). */
  applyStatus(event: BusStatusEvent) {
    const current = state.buses[event.busId];
    if (!current || current.status === event.status) {
      if (current) {
        state = { ...state, lastMessageAt: Date.now() };
        emit();
      }
      return;
    }

    state = {
      ...state,
      buses: {
        ...state.buses,
        [event.busId]: {
          ...current,
          status: event.status,
          lastLocationAt: event.lastLocationAt ?? current.lastLocationAt,
        },
      },
      lastMessageAt: Date.now(),
    };
    emit();
  },

  setSocketConnected(connected: boolean) {
    if (state.socketConnected === connected) return;
    patch({ socketConnected: connected });
  },

  /** Marks that *some* server payload arrived (used by the connection badge). */
  touchMessage() {
    patch({ lastMessageAt: Date.now() });
  },
};

/** `true` when `next` is strictly newer than `current` (null counts as old). */
const isNewer = (current: string | null, next: string | null): boolean => {
  if (!next) return false;
  if (!current) return true;
  return Date.parse(next) > Date.parse(current);
};
