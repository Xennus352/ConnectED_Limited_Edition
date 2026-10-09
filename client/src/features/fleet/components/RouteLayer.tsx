/**
 * Stored route geometry: a polyline through the route's stops plus a marker
 * for every stop, each with a popup.
 *
 * Everything here comes from the database (the snapshot) — nothing is
 * interpolated or invented. Which students are named inside a stop popup is
 * decided by the backend's scope: a parent only ever sees their own children
 * and a driver sees none.
 */
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CircleMarker, Popup, Polyline } from "react-leaflet";

import { useFleetBus, useFleetSelector } from "../hooks";
import type { FleetState } from "../store";

export interface StopView {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  estimatedArrival: number | null;
  routeId: string;
  routeName: string;
  /** Names of the riders boarding here — empty when not permitted. */
  riders: string[];
  /** Backend-provided count (role-gated), `null` when hidden. */
  riderCount: number | null;
}

const sameRiders = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((name, index) => name === b[index]);

const sameStops = (a: StopView[], b: StopView[]): boolean =>
  a.length === b.length &&
  a.every(
    (stop, index) =>
      stop.id === b[index].id &&
      stop.name === b[index].name &&
      stop.latitude === b[index].latitude &&
      stop.longitude === b[index].longitude &&
      stop.sequence === b[index].sequence &&
      stop.estimatedArrival === b[index].estimatedArrival &&
      stop.routeId === b[index].routeId &&
      stop.riderCount === b[index].riderCount &&
      sameRiders(stop.riders, b[index].riders)
  );

/** Unique stops across every visible route, riders merged per stop. */
const selectStops = (state: FleetState): StopView[] => {
  const byId = new Map<string, StopView>();

  for (const bus of Object.values(state.buses)) {
    const route = bus.route;
    if (!route) continue;

    for (const stop of route.stops) {
      if (stop.isActive === false) continue;
      if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) continue;

      let entry = byId.get(stop.id);
      if (!entry) {
        entry = {
          id: stop.id,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          sequence: stop.sequence,
          estimatedArrival: stop.estimatedArrival ?? null,
          routeId: route.id,
          routeName: route.name,
          riders: [],
          riderCount: stop.studentCount ?? null,
        };
        byId.set(stop.id, entry);
      } else if (entry.riderCount === null && typeof stop.studentCount === "number") {
        entry.riderCount = stop.studentCount;
      }

      for (const student of bus.students) {
        if (student.pickupStopId === stop.id && !entry.riders.includes(student.fullName)) {
          entry.riders.push(student.fullName);
        }
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name)
  );
};

interface RouteView {
  id: string;
  name: string;
  positions: [number, number][];
  stopIds: string[];
}

interface RouteLayerProps {
  selectedBusId: string | null;
}

const RouteLayer: React.FC<RouteLayerProps> = ({ selectedBusId }) => {
  const { t } = useTranslation();
  const stops = useFleetSelector(selectStops, sameStops);
  const selectedBus = useFleetBus(selectedBusId);
  const selectedRouteId = selectedBus?.route?.id ?? null;

  const routes = useMemo<RouteView[]>(() => {
    const grouped = new Map<string, RouteView>();
    for (const stop of stops) {
      let route = grouped.get(stop.routeId);
      if (!route) {
        route = { id: stop.routeId, name: stop.routeName, positions: [], stopIds: [] };
        grouped.set(stop.routeId, route);
      }
      route.positions.push([stop.latitude, stop.longitude]);
      route.stopIds.push(stop.id);
    }
    return [...grouped.values()];
  }, [stops]);

  return (
    <>
      {routes.map((route) => {
        const highlighted = route.id === selectedRouteId;
        if (route.positions.length < 2) return null;

        return (
          <Polyline
            key={route.id}
            positions={route.positions}
            pathOptions={{
              color: highlighted ? "#0ea5e9" : "#94a3b8",
              weight: highlighted ? 5 : 3,
              opacity: highlighted ? 0.9 : 0.4,
              dashArray: highlighted ? undefined : "6 8",
              lineJoin: "round",
            }}
          />
        );
      })}

      {stops.map((stop) => {
        const highlighted = stop.routeId === selectedRouteId;
        const showNames = stop.riders.length > 0;

        return (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={highlighted ? 7 : 5}
            pathOptions={{
              color: highlighted ? "#0284c7" : "#64748b",
              weight: 2,
              fillColor: highlighted ? "#38bdf8" : "#cbd5e1",
              fillOpacity: highlighted ? 0.95 : 0.7,
            }}
          >
            <Popup maxWidth={260} minWidth={200}>
              <div className='space-y-1.5'>
                <p className='text-sm font-semibold leading-tight'>{stop.name}</p>
                <p className='text-[11px] text-muted-foreground'>{stop.routeName}</p>

                <div className='flex flex-wrap items-center gap-1.5 text-[11px]'>
                  <span className='rounded bg-muted px-1.5 py-0.5 font-medium'>
                    #{stop.sequence}
                  </span>
                  {stop.estimatedArrival !== null && stop.estimatedArrival > 0 ? (
                    <span className='rounded bg-muted px-1.5 py-0.5 font-medium'>
                      {t("fleet.stop.arrival", { minutes: stop.estimatedArrival })}
                    </span>
                  ) : null}
                </div>

                {showNames ? (
                  <ul className='space-y-0.5 border-t pt-1.5 text-[11px] text-muted-foreground'>
                    <li className='font-medium text-foreground'>
                      {t("fleet.stop.riders", { count: stop.riders.length })}
                    </li>
                    {stop.riders.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : typeof stop.riderCount === "number" ? (
                  <p className='border-t pt-1.5 text-[11px] text-muted-foreground'>
                    {t("fleet.stop.riders", { count: stop.riderCount })}
                  </p>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

export default React.memo(RouteLayer);
