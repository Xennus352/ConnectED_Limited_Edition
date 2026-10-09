import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import { Marker, Popup, Tooltip } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";

import { useBusFreshness, useTicker } from "../hooks";
import {
  ageOf,
  formatAge,
  formatHeading,
  formatSpeed,
} from "../freshness";
import type { BusStatus, FleetBus, Freshness } from "../types";
import { useAnimatedPosition } from "../useAnimatedPosition";

interface BusMarkerProps {
  bus: FleetBus;
  focusNonce: number;
  clockOffset: number;
  selected: boolean;
  onSelect: (busId: string) => void;
}

/** Marker colours by operational status — picked to read on any basemap. */
const STATUS_COLORS: Record<BusStatus, string> = {
  RUNNING: "#22c55e",
  IDLE: "#f59e0b",
  STOPPED: "#0ea5e9",
  OFFLINE: "#64748b",
};

/** Badge colours by GPS freshness (how recent the last fix is). */
const FRESHNESS_COLORS: Record<Freshness, string> = {
  LIVE: "#22c55e",
  DELAYED: "#f59e0b",
  STALE: "#ef4444",
  OFFLINE: "#64748b",
};

const withAlpha = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Side-profile bus glyph — status colour inside a subtle white outline. */
const busGlyphSvg = (color: string): string => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 34" width="50" height="28" aria-hidden="true">
    <rect x="2" y="8" width="56" height="18" rx="7" fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/>
    <path d="M14 8 13 3h32l1 5z" fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="1.2" opacity="0.95"/>
    <rect x="7" y="10" width="9" height="6" rx="2" fill="rgba(255,255,255,0.55)"/>
    <rect x="19" y="10" width="9" height="6" rx="2" fill="rgba(255,255,255,0.55)"/>
    <rect x="31" y="10" width="9" height="6" rx="2" fill="rgba(255,255,255,0.55)"/>
    <path d="M42 9h11a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H42z" fill="rgba(255,255,255,0.92)"/>
    <rect x="2" y="18.5" width="56" height="2.2" fill="rgba(255,255,255,0.35)"/>
    <circle cx="14" cy="25" r="5.5" fill="#1e293b"/>
    <circle cx="14" cy="25" r="2" fill="#cbd5e1"/>
    <circle cx="46" cy="25" r="5.5" fill="#1e293b"/>
    <circle cx="46" cy="25" r="2" fill="#cbd5e1"/>
    <rect x="53" y="20" width="5" height="3.5" rx="1" fill="#fde047"/>
  </svg>`;

const buildBusIcon = (
  status: BusStatus,
  freshness: Freshness,
  selected: boolean
): L.DivIcon => {
  const statusColor = STATUS_COLORS[status] ?? "#64748b";
  const live = freshness === "LIVE";
  const pulse = live
    ? `<div class="fleet-bus-pulse" style="background:${withAlpha(statusColor, 0.28)}"></div>`
    : "";
  const ring = selected ? `<div class="fleet-bus-selected"></div>` : "";

  return L.divIcon({
    className: "fleet-bus-divicon",
    html:
      `<div class="fleet-bus-marker${selected ? " is-selected" : ""}">` +
      ring +
      pulse +
      busGlyphSvg(statusColor) +
      `<span class="fleet-bus-dot" style="background:${statusColor}"></span>` +
      `</div>`,
    iconSize: [56, 46],
    iconAnchor: [28, 23],
    popupAnchor: [0, -18],
    tooltipAnchor: [0, -22],
  });
};

const BusMarkerComponent: React.FC<BusMarkerProps> = ({
  bus,
  focusNonce,
  clockOffset,
  selected,
  onSelect,
}) => {
  const { t } = useTranslation();
  const freshness = useBusFreshness(bus);
  useTicker(1000);
  const markerRef = useRef<LeafletMarker | null>(null);
  const position = useAnimatedPosition(bus.latitude, bus.longitude, bus.lastLocationAt);

  useEffect(() => {
    if (focusNonce <= 0) return;
    markerRef.current?.openPopup();
  }, [focusNonce]);

  const ageLabel = formatAge(ageOf(bus.lastLocationAt, clockOffset));
  const speedLabel = formatSpeed(bus.speed);
  const headingLabel = formatHeading(bus.heading);

  const freshnessLabel = useMemo(() => {
    switch (freshness) {
      case "LIVE":
        return t("fleet.statusLive");
      case "DELAYED":
        return t("fleet.statusUpdating");
      case "STALE":
        return t("fleet.statusStale");
      default:
        return t("fleet.statusOffline");
    }
  }, [freshness, t]);

  const statusLabel = useMemo(() => {
    switch (bus.status) {
      case "RUNNING":
        return t("fleet.statusRunning");
      case "IDLE":
        return t("fleet.statusIdle");
      case "STOPPED":
        return t("fleet.statusStopped");
      default:
        return t("fleet.statusOffline");
    }
  }, [bus.status, t]);

  // Only rebuild the icon when one of its visual inputs changes — a GPS tick
  // that keeps the same status/freshness must not recreate the marker.
  const icon = useMemo(
    () => buildBusIcon(bus.status, freshness, selected),
    [bus.status, freshness, selected]
  );

  return (
    <Marker
      position={position as [number, number]}
      ref={markerRef}
      icon={icon}
      riseOnHover={true}
      eventHandlers={{ click: () => onSelect(bus.id) }}
    >
      <Tooltip direction='top' offset={[0, -8]} opacity={1} className='fleet-bus-tooltip'>
        <p className='text-[11px] font-semibold leading-none text-foreground'>
          {bus.busNumber}
          {bus.name ? <span className='ml-1 font-normal text-muted-foreground'>{bus.name}</span> : null}
        </p>
      </Tooltip>

      <Popup maxWidth={280} minWidth={230} autoPanPadding={[24, 24]}>
        <div className='w-64 space-y-2'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold leading-tight text-foreground'>
                {bus.busNumber}
              </p>
              {bus.name ? (
                <p className='truncate text-[11px] text-muted-foreground'>{bus.name}</p>
              ) : null}
            </div>
            <div className='flex shrink-0 flex-col items-end gap-1'>
              <span
                className='rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white'
                style={{ backgroundColor: FRESHNESS_COLORS[freshness] ?? "#64748b" }}
              >
                {freshnessLabel}
              </span>
              <span
                className='rounded-full px-2 py-0.5 text-[10px] font-semibold'
                style={{
                  backgroundColor: withAlpha(STATUS_COLORS[bus.status] ?? "#64748b", 0.16),
                  color: STATUS_COLORS[bus.status] ?? "#64748b",
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-2 text-[11px]'>
            <dt className='text-muted-foreground'>{t("fleet.speed")}</dt>
            <dd className='text-right font-medium text-foreground'>{speedLabel}</dd>
            <dt className='text-muted-foreground'>{t("fleet.heading")}</dt>
            <dd className='text-right font-medium text-foreground'>{headingLabel}</dd>
            <dt className='text-muted-foreground'>{t("fleet.lastUpdate")}</dt>
            <dd className='text-right font-medium text-foreground'>{ageLabel}</dd>
          </dl>

          {bus.route?.name || bus.driver?.fullName ? (
            <div className='space-y-1 border-t pt-2 text-[11px]'>
              {bus.route?.name ? (
                <p className='flex items-baseline justify-between gap-3'>
                  <span className='text-muted-foreground'>{t("fleet.route")}</span>
                  <span className='truncate font-medium text-foreground'>{bus.route.name}</span>
                </p>
              ) : null}
              {bus.driver?.fullName ? (
                <p className='flex items-baseline justify-between gap-3'>
                  <span className='text-muted-foreground'>{t("fleet.driver")}</span>
                  <span className='truncate font-medium text-foreground'>{bus.driver.fullName}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
};

export const BusMarker = React.memo(BusMarkerComponent);
export default BusMarker;