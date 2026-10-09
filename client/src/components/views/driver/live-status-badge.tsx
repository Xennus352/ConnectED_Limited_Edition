import React from "react";
import { useTranslation } from "react-i18next";
import { Signal, SignalHigh, SignalLow, WifiOff, Ban } from "lucide-react";
import type { Freshness } from "@/features/fleet/types";

export type LiveStatusVariant = Freshness | "NONE" | "DISCONNECTED";

interface LiveStatusBadgeProps {
  /** GPS freshness of the bus (LIVE / DELAYED / STALE / OFFLINE), or
   * "NONE" when there is no active trip, or "DISCONNECTED" for the socket. */
  status: LiveStatusVariant;
  /** Extra detail rendered next to the label (e.g. "4 sec ago"). */
  detail?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

const META: Record<
  LiveStatusVariant,
  { labelKey: string; dot: string; text: string; ring: string }
> = {
  LIVE: {
    labelKey: "driver_common.live",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "driver-pulse-live",
  },
  DELAYED: {
    labelKey: "driver_common.updating",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    ring: "driver-pulse-stale",
  },
  STALE: {
    labelKey: "driver_common.stale",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    ring: "driver-pulse-stale",
  },
  OFFLINE: {
    labelKey: "driver_common.offline",
    dot: "bg-zinc-400 dark:bg-zinc-500",
    text: "text-muted-foreground",
    ring: "",
  },
  NONE: {
    labelKey: "driver_common.no_active_trip",
    dot: "bg-slate-400 dark:bg-slate-500",
    text: "text-muted-foreground",
    ring: "",
  },
  DISCONNECTED: {
    labelKey: "driver_common.connection_lost",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    ring: "driver-pulse-stale",
  },
};

const ICONS: Record<LiveStatusVariant, React.ReactNode> = {
  LIVE: <Signal className='h-3.5 w-3.5' />,
  DELAYED: <SignalHigh className='h-3.5 w-3.5' />,
  STALE: <SignalLow className='h-3.5 w-3.5' />,
  OFFLINE: <WifiOff className='h-3.5 w-3.5' />,
  NONE: <Ban className='h-3.5 w-3.5' />,
  DISCONNECTED: <WifiOff className='h-3.5 w-3.5' />,
};

/** Status chip with a live dot. Never conveys state through colour alone —
 * the label always spells the state out (LIVE / STALE / OFFLINE / NO ACTIVE
 * TRIP). */
export const LiveStatusBadge: React.FC<LiveStatusBadgeProps> = ({
  status,
  detail,
  size = "md",
  className = "",
}) => {
  const { t } = useTranslation();
  const meta = META[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 shadow-sm ${className}`}
    >
      <span className='relative flex h-2 w-2 shrink-0'>
        {meta.ring ? (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${meta.ring} ${meta.dot}`}
          />
        ) : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
      </span>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${meta.text}`}>
        {size === "md" ? ICONS[status] : null}
        {t(meta.labelKey)}
      </span>
      {detail ? (
        <span className='text-xs text-muted-foreground'>{detail}</span>
      ) : null}
    </span>
  );
};

export default LiveStatusBadge;