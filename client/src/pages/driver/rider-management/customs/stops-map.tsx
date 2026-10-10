import React, { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { useFleetSelector } from "@/features/fleet/hooks";

import { distanceKm } from "./location";
import type { StopOption } from "./types";

/** Fallbacks used until the fleet snapshot supplies map config. */
const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "© OpenStreetMap";
const FALLBACK_CENTER: [number, number] = [18.94, 96.43];

const PICKUP_COLOR = "#059669";
const DROPOFF_COLOR = "#d97706";
const STOP_COLOR = "#94a3b8";
const SHARED_COLOR = "#8b5cf6";

/** A stop is drawable only with a real, non-null fix (0,0 means "unset"). */
const isPlottable = (stop: StopOption): boolean =>
  Number.isFinite(stop.latitude) &&
  Number.isFinite(stop.longitude) &&
  !(stop.latitude === 0 && stop.longitude === 0);

/** Re-frames the map whenever the points it should show change. */
const FitPoints: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 16 });
  }, [map, points]);

  return null;
};

/**
 * In interactive mode a plain click on the map resolves to the nearest route
 * stop and calls `onPickStop` with it — the "click a location, grep it into
 * the form" behaviour.
 */
const MapClickPicker: React.FC<{
  stops: StopOption[];
  onPickStop: (stopId: string) => void;
}> = ({ stops, onPickStop }) => {
  useMapEvents({
    click: (event) => {
      const point: [number, number] = [event.latlng.lat, event.latlng.lng];

      let nearest: StopOption | null = null;
      let bestDistance = Infinity;
      for (const stop of stops) {
        if (!isPlottable(stop)) continue;
        const d = distanceKm(point, [stop.latitude, stop.longitude]);
        if (d < bestDistance) {
          bestDistance = d;
          nearest = stop;
        }
      }

      if (nearest) onPickStop(nearest.id);
    },
  });

  return null;
};

interface StopsMapProps {
  stops: StopOption[];
  pickupStopId?: string | null;
  dropoffStopId?: string | null;
  emptyLabel: string;
  /** Marker for a location shared via a link — drawn until a stop is picked. */
  sharedPoint?: { latitude: number; longitude: number } | null;
  sharedLabel?: string;
  /** When true, clicking the map picks the nearest stop. */
  interactive?: boolean;
  onPickStop?: (stopId: string) => void;
  className?: string;
}

/**
 * Mini route map: draws the route geometry (polyline + one circle per stop),
 * highlights the picked pickup/drop-off stops, and — when enabled — acts as a
 * picker (click = nearest stop). Data comes from the same route the fleet map
 * uses, so nothing new is invented client-side.
 */
const StopsMap: React.FC<StopsMapProps> = ({
  stops,
  pickupStopId,
  dropoffStopId,
  emptyLabel,
  sharedPoint,
  sharedLabel,
  interactive = false,
  onPickStop,
  className = "h-56",
}) => {
  const meta = useFleetSelector((state) => state.meta);

  const drawable = useMemo(() => stops.filter(isPlottable), [stops]);

  const allPoints = useMemo<[number, number][]>(
    () => drawable.map((stop) => [stop.latitude, stop.longitude]),
    [drawable]
  );

  const selectedPoints = useMemo<[number, number][]>(
    () =>
      drawable
        .filter(
          (stop) => stop.id === pickupStopId || stop.id === dropoffStopId
        )
        .map((stop) => [stop.latitude, stop.longitude]),
    [drawable, pickupStopId, dropoffStopId]
  );

  // Include a shared location in the framing so the driver can see both the
  // reported point and the nearest route stop at once.
  const fitPoints = useMemo<[number, number][]>(() => {
    const points: [number, number][] = [];
    if (
      sharedPoint &&
      Number.isFinite(sharedPoint.latitude) &&
      Number.isFinite(sharedPoint.longitude)
    ) {
      points.push([sharedPoint.latitude, sharedPoint.longitude]);
    }
    points.push(...selectedPoints);
    return points.length > 0 ? points : allPoints;
  }, [allPoints, selectedPoints, sharedPoint]);

  if (drawable.length === 0) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground ${className}`}
      >
        {emptyLabel}
      </div>
    );
  }

  const tileUrl = meta?.map.tileUrl ?? OSM_TILE;
  const attribution = meta?.map.tileAttribution ?? OSM_ATTRIBUTION;

  return (
    // `isolate` keeps Leaflet's internal pane z-indexes (200–700) contained so
    // the map can never overlap the form's autocomplete dropdowns.
    <div
      className={`relative isolate w-full overflow-hidden rounded-xl border ${className}`}
    >
      <MapContainer
        center={meta?.map.center ?? fitPoints[0] ?? FALLBACK_CENTER}
        zoom={meta?.map.zoom ?? 13}
        className='h-full w-full'
        scrollWheelZoom={false}
      >
        <TileLayer key={tileUrl} url={tileUrl} attribution={attribution} />

        <Polyline
          positions={allPoints}
          pathOptions={{ color: "#6366f1", weight: 3, opacity: 0.75 }}
        />

        {sharedPoint &&
        Number.isFinite(sharedPoint.latitude) &&
        Number.isFinite(sharedPoint.longitude) ? (
          <CircleMarker
            center={[sharedPoint.latitude, sharedPoint.longitude]}
            radius={9}
            pathOptions={{
              color: SHARED_COLOR,
              fillColor: SHARED_COLOR,
              fillOpacity: 0.25,
              weight: 3,
              dashArray: "6 6",
            }}
          >
            <Tooltip direction='top'>{sharedLabel}</Tooltip>
          </CircleMarker>
        ) : null}

        {drawable.map((stop) => {
          const isPickup = stop.id === pickupStopId;
          const isDropoff = stop.id === dropoffStopId;
          const color = isPickup
            ? PICKUP_COLOR
            : isDropoff
              ? DROPOFF_COLOR
              : STOP_COLOR;
          const radius = isPickup || isDropoff ? 9 : 5;

          return (
            <CircleMarker
              key={stop.id}
              center={[stop.latitude, stop.longitude]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={
                interactive
                  ? {
                      click: () => onPickStop?.(stop.id),
                    }
                  : undefined
              }
            >
              <Tooltip direction='top'>{stop.name}</Tooltip>
            </CircleMarker>
          );
        })}

        {interactive && onPickStop ? (
          <MapClickPicker stops={drawable} onPickStop={onPickStop} />
        ) : null}

        <FitPoints points={fitPoints} />
      </MapContainer>
    </div>
  );
};

export default StopsMap;