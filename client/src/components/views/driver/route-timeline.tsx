import React from "react";
import { CheckCircle2, Circle, Flag } from "lucide-react";

export interface TimelineStop {
  id?: string;
  name: string;
  /** Optional wall-clock or relative time label for this stop. */
  time?: string | null;
  /** Optional supporting line (arrival minutes, riders, ...). */
  detail?: string | null;
  state: "completed" | "current" | "upcoming";
}

interface RouteTimelineProps {
  stops: TimelineStop[];
  /** Vertical line cap for the end of the route. */
  showFinish?: boolean;
  className?: string;
}

const NODE: Record<
  TimelineStop["state"],
  { icon: React.ReactNode; ring: string; text: string }
> = {
  completed: {
    icon: <CheckCircle2 className='h-4 w-4 text-emerald-500' />,
    ring: "border-emerald-500/40 bg-emerald-500/10",
    text: "line-through decoration-emerald-500/40",
  },
  current: {
    icon: <span className='h-2.5 w-2.5 rounded-full bg-primary driver-pulse-live' />,
    ring: "border-primary bg-primary/10 driver-pulse-live",
    text: "font-semibold",
  },
  upcoming: {
    icon: <Circle className='h-4 w-4 text-muted-foreground/60' />,
    ring: "border-border bg-muted/40",
    text: "text-muted-foreground",
  },
};

/**
 * Vertical route timeline: completed / current / upcoming stops.
 * The current stop is emphasised and gently animated; nothing else moves.
 */
export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  stops,
  showFinish = true,
  className = "",
}) => (
  <ol className={`relative ${className}`}>
    {stops.map((stop, index) => {
      const node = NODE[stop.state];
      const isLast = index === stops.length - 1;
      return (
        <li key={stop.id ?? index} className='relative flex gap-3 pb-5 last:pb-0'>
          {/* rail */}
          {!isLast ? (
            <span
              className={`absolute left-[15px] top-7 h-[calc(100%-14px)] w-px ${
                stop.state === "completed" ? "bg-emerald-500/50" : "bg-border"
              }`}
            />
          ) : null}
          {/* node */}
          <span
            className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${node.ring}`}
            aria-hidden='true'
          >
            {node.icon}
          </span>
          {/* content */}
          <div className='min-w-0 flex-1 pt-1'>
            <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
              <span className={`text-sm ${node.text} ${stop.state === "current" ? "" : ""}`}>
                {stop.name}
              </span>
              {stop.time ? (
                <span className='text-xs tabular-nums text-muted-foreground'>{stop.time}</span>
              ) : null}
              {stop.state === "current" ? (
                <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary'>
                  current
                </span>
              ) : null}
            </div>
            {stop.detail ? (
              <div className='mt-0.5 text-xs text-muted-foreground'>{stop.detail}</div>
            ) : null}
          </div>
        </li>
      );
    })}
    {showFinish ? (
      <li className='flex gap-3'>
        <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40'>
          <Flag className='h-4 w-4 text-muted-foreground/60' />
        </span>
        <span className='pt-1.5 text-sm text-muted-foreground'>Finish</span>
      </li>
    ) : null}
  </ol>
);

export default RouteTimeline;