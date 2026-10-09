import React from "react";
import { useTranslation } from "react-i18next";

export interface ProgressStop {
  id?: string;
  name: string;
  /** "completed" | "current" | "upcoming" */
  state: "completed" | "current" | "upcoming";
}

interface TripProgressProps {
  stops: ProgressStop[];
  /** Real fraction of the route covered, 0..1. */
  fraction: number;
  /** Whether the trip is IN_PROGRESS (enables the live progress animation). */
  active?: boolean;
  className?: string;
}

const STOP_DOT: Record<ProgressStop["state"], string> = {
  completed: "bg-emerald-500 border-emerald-500",
  current: "bg-primary border-primary driver-pulse-live",
  upcoming: "bg-card border-border",
};

/**
 * Horizontal route progress: a weighted bar of stops with a true percentage.
 * The progress comes from real GPS-vs-route geometry, never a timer.
 */
export const TripProgress: React.FC<TripProgressProps> = ({
  stops,
  fraction,
  active = false,
  className = "",
}) => {
  const { t } = useTranslation();
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);

  if (stops.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className='flex items-center gap-2'>
        <span className='text-xs font-medium text-muted-foreground'>
          {t("driver_common.route_progress")}
        </span>
        <span className='ml-auto text-sm font-bold tabular-nums'>{pct}%</span>
      </div>

      <div className='flex items-center gap-0.5'>
        {stops.map((stop, index) => (
          <React.Fragment key={stop.id ?? index}>
            {index > 0 ? (
              <span
                className={`h-1 flex-1 rounded-full ${
                  stop.state === "upcoming" ? "bg-muted" : "bg-emerald-500"
                }`}
              />
            ) : null}
            <span
              title={stop.name}
              className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-colors ${STOP_DOT[stop.state]}`}
            />
          </React.Fragment>
        ))}
      </div>

      <div
        className='h-1.5 overflow-hidden rounded-full bg-muted'
        role='progressbar'
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 ${
            active ? "driver-progress-live" : "transition-all duration-700"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default TripProgress;