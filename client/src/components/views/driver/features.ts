/**
 * Driver workspace hook — one source of truth for every driver screen.
 *
 * It wires the realtime fleet store (initial role-scoped snapshot + live
 * `bus:location` / `bus:status` events) together with the driver's own
 * trip/incident data, and exposes honest derived values: the current/next
 * trip, the assigned bus, its GPS freshness, and route progress computed
 * from the real last fix and the real stop coordinates.
 */
import { useMemo } from "react";

import { useDriverService } from "@/services/transport";
import {
  useBusFreshness,
  useConnection,
  useFleetBus,
  useFleetRealtime,
  useFleetSnapshot,
} from "@/features/fleet/hooks";
import { hasFix } from "@/features/fleet/freshness";
import type { FleetBus } from "@/features/fleet/types";
import { projectOnRoute, type PolylineStop } from "@/lib/driver-geo";
import type {
  DriverDataTrip,
  UseDriverWorkspaceReturn,
} from "./workspace-types";

/** Trip statuses treated as "active work the driver should focus on". */
export const ACTIONABLE_TRIP_STATUSES = ["SCHEDULED", "READY", "DELAYED"];

export type { DriverDataTrip, UseDriverWorkspaceReturn } from "./workspace-types";

const asStops = (bus: FleetBus | undefined | null): PolylineStop[] =>
  (bus?.route?.stops ?? []).map((stop) => ({
    id: stop.id,
    name: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sequence: stop.sequence,
  }));

export const useDriverWorkspace = () => {
  const {
    getMyTrips,
    getMyBus,
    getMyIncidents,
    startTrip,
    completeTrip,
    delayTrip,
    reportIncident,
  } = useDriverService();

  // Realtime layer: shared snapshot + socket listeners.
  const snapshot = useFleetSnapshot();
  useFleetRealtime();

  const trips = useMemo(
    () => (getMyTrips.data?.data ?? []) as DriverDataTrip[],
    [getMyTrips.data]
  );
  const assigned = getMyBus.data as FleetBus | null | undefined;
  const incidents = (getMyIncidents.data?.data ??
    getMyIncidents.data ?? []) as any[];

  // The live bus (realtime/snapshot store) falling back to the assigned bus.
  const busId = assigned?.id ?? null;
  const liveBus = useFleetBus(busId);
  const effectiveBus = liveBus ?? assigned ?? null;

  const currentTrip = useMemo(
    () => trips.find((trip) => trip.status === "IN_PROGRESS") ?? null,
    [trips]
  );
  const nextTrip = useMemo(
    () =>
      trips.find((trip) =>
        ACTIONABLE_TRIP_STATUSES.includes(trip.status)
      ) ?? null,
    [trips]
  );

  const freshness = useBusFreshness(effectiveBus ?? undefined);
  const connection = useConnection();
  const hasGpsFix = effectiveBus != null && hasFix(effectiveBus);

  const geo = useMemo(
    () => projectOnRoute(
      asStops(effectiveBus),
      effectiveBus
        ? {
            latitude: effectiveBus.latitude ?? 0,
            longitude: effectiveBus.longitude ?? 0,
          }
        : null,
      Number(effectiveBus?.speed ?? 0)
    ),
    [effectiveBus]
  );

  const onDuty =
    currentTrip?.status === "IN_PROGRESS" || liveBus?.status === "RUNNING";

  return {
    trips,
    assigned: liveBus ?? assigned ?? null,
    hasAssignedBus: Boolean(busId),
    loadingBus: getMyBus.isLoading,
    loadingTrips: getMyTrips.isLoading,
    loadingIncidents: getMyIncidents.isLoading,
    currentTrip,
    nextTrip,
    incidents,
    freshness,
    connection,
    hasGpsFix,
    geo,
    onDuty,
    snapshot,
    actions: { startTrip, completeTrip, delayTrip, reportIncident },
    refetch: () => {
      getMyTrips.refetch();
      getMyBus.refetch();
      getMyIncidents.refetch();
    },
  } satisfies UseDriverWorkspaceReturn;
};

export default useDriverWorkspace;