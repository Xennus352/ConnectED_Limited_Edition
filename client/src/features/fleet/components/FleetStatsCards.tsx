/**
 * Fleet statistics derived from the store. They move on their own because
 * the store does — no refetch, no interval polling.
 */
import React from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";
import { useFleetSelector, useTicker } from "../hooks";
import { FRESHNESS_COLOR, STATUS_COLOR } from "../freshness";
import type { FleetState } from "../store";

export interface FleetStats {
  total: number;
  running: number;
  idle: number;
  stopped: number;
  offline: number;
  /** Vehicles whose last fix is still inside the "fresh" window. */
  live: number;
}

const sameStats = (a: FleetStats, b: FleetStats): boolean =>
  a.total === b.total &&
  a.running === b.running &&
  a.idle === b.idle &&
  a.stopped === b.stopped &&
  a.offline === b.offline &&
  a.live === b.live;

const selectStats = (state: FleetState): FleetStats => {
  const stats: FleetStats = {
    total: 0,
    running: 0,
    idle: 0,
    stopped: 0,
    offline: 0,
    live: 0,
  };
  const freshSeconds = state.meta?.thresholds.freshSeconds ?? 15;

  for (const bus of Object.values(state.buses)) {
    stats.total += 1;
    if (bus.status === "RUNNING") stats.running += 1;
    else if (bus.status === "IDLE") stats.idle += 1;
    else if (bus.status === "STOPPED") stats.stopped += 1;
    else stats.offline += 1;

    if (bus.lastLocationAt) {
      const age = Date.now() + state.clockOffset - Date.parse(bus.lastLocationAt);
      if (Number.isFinite(age) && age >= 0 && age < freshSeconds * 1000) stats.live += 1;
    }
  }

  return stats;
};

const TILES: Array<{
  key: keyof FleetStats;
  label: string;
  color: string;
}> = [
  { key: "total", label: "fleet.stats.total", color: "#64748b" },
  { key: "running", label: "fleet.stats.running", color: STATUS_COLOR.RUNNING },
  { key: "idle", label: "fleet.stats.idle", color: STATUS_COLOR.IDLE },
  { key: "stopped", label: "fleet.stats.stopped", color: STATUS_COLOR.STOPPED },
  { key: "offline", label: "fleet.stats.offline", color: STATUS_COLOR.OFFLINE },
  { key: "live", label: "fleet.stats.live", color: FRESHNESS_COLOR.LIVE },
];

const TILES_LIST: Array<{
  key: keyof FleetStats;
  label: string;
  color: string;
}> = TILES as any;
const FleetStatsCards: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t } = useTranslation();
  // The "live fixes" tile must age out even when nothing is being posted.
  useTicker(5000);
  const stats = useFleetSelector(selectStats, sameStats);

  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"}`}
    >
      {TILES_LIST.map((tile) => (
        <Card key={tile.key} className='shadow-sm'>
          <CardContent className='flex items-center gap-2.5 px-3 py-2.5'>
            <span
              className='size-2.5 shrink-0 rounded-full'
              style={{ background: tile.color }}
              aria-hidden='true'
            />
            <div className='min-w-0'>
              <p className='text-lg font-semibold leading-none'>{stats[tile.key]}</p>
              <p className='truncate text-[11px] text-muted-foreground'>
                {t(tile.label)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FleetStatsCards;
