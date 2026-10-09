/**
 * Small status indicators shared by the map, the panel and the list pages.
 * Colours come from the freshness module so every surface agrees on what
 * "stale" looks like.
 */
import React from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { useBusFreshness, useFleetBus } from "../hooks";
import { FRESHNESS_COLOR, STATUS_COLOR, ageOf, formatAge } from "../freshness";
import { FRESHNESS_KEY } from "./FRESHNESS_KEY";

import type { BusStatus, FleetBus, Freshness } from "../types";

interface FreshnessBadgeProps {
  bus: FleetBus;
  /** Show the human age next to the state ("LIVE · 3s ago"). */
  showAge?: boolean;
  clockOffset?: number;
}

/** `LIVE · 3s ago` — how fresh this vehicle's last fix really is. */
export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({
  bus,
  showAge = true,
  clockOffset = 0,
}) => {
  const { t } = useTranslation();
  const freshness = useBusFreshness(bus);
  const age = showAge ? formatAge(ageOf(bus.lastLocationAt, clockOffset)) : null;

  return (
    <span
      className='inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium'
      style={{ color: FRESHNESS_COLOR[freshness] }}
    >
      <span
        className='size-1.5 shrink-0 rounded-full'
        style={{ background: FRESHNESS_COLOR[freshness] }}
      />
      {t(FRESHNESS_KEY[freshness])}
      {age ? <span className='text-muted-foreground'>· {age}</span> : null}
    </span>
  );
};

const STATUS_VARIANT: Record<BusStatus, "success" | "warning" | "secondary" | "neutral"> = {
  RUNNING: "success",
  IDLE: "warning",
  STOPPED: "secondary",
  OFFLINE: "neutral",
};

/** Operational status of the vehicle (`RUNNING / IDLE / STOPPED / OFFLINE`). */
export const StatusBadge: React.FC<{ status: BusStatus; className?: string }> = ({
  status,
  className = "",
}) => (
  <Badge variant={STATUS_VARIANT[status]} className={className}>
    <span
      className='size-1.5 rounded-full'
      style={{ background: STATUS_COLOR[status] }}
      aria-hidden='true'
    />
    {status}
  </Badge>
);

/** Convenience for rows that only carry a bus id. */
export const BusFreshness: React.FC<{ busId: string; showAge?: boolean }> = ({
  busId,
  showAge,
}) => {
  const bus = useFleetBus(busId);
  if (!bus) return null;
  return <FreshnessBadge bus={bus} showAge={showAge} />;
};

export type { Freshness };
