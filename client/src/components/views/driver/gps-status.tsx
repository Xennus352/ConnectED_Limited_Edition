import React from "react";
import { useTranslation } from "react-i18next";
import { Navigation, Gauge } from "lucide-react";
import { ageOf, formatAge, formatSpeed } from "@/features/fleet/freshness";
import type { FleetBus } from "@/features/fleet/types";
import LiveStatusBadge, { type LiveStatusVariant } from "./live-status-badge";

interface GpsStatusProps {
  bus: FleetBus | null | undefined;
  /** Freshness variant to show ("NONE" when no activity to report). */
  status: LiveStatusVariant;
  /** Clock offset shared by the fleet store (for age labels). */
  clockOffset?: number;
  compact?: boolean;
}

/** GPS row: freshness badge + speed + heading + age of the last fix. */
export const GpsStatus: React.FC<GpsStatusProps> = ({
  bus,
  status,
  clockOffset = 0,
  compact = false,
}) => {
  const { t } = useTranslation();
  const lastLocationAt = bus?.lastLocationAt ?? null;
  const age = ageOf(lastLocationAt, clockOffset);
  const heading = bus?.heading ?? 0;

  if (compact) {
    return (
      <div className='flex items-center gap-2'>
        <LiveStatusBadge status={status} detail={bus ? formatAge(age) : undefined} size='sm' />
        {(bus?.speed ?? 0) > 0 ? (
          <span className='text-sm font-semibold tabular-nums'>
            {formatSpeed(bus?.speed ?? 0)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm'>
      <div className='flex items-center justify-between gap-2'>
        <LiveStatusBadge status={status} detail={bus ? formatAge(age) : undefined} size='sm' />
        <span className='text-xs text-muted-foreground'>
          {t("driver_common.last_update")} {formatAge(age)}
        </span>
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Gauge className='h-4 w-4 text-muted-foreground' />
          <span className='font-semibold tabular-nums'>{formatSpeed(bus?.speed ?? 0)}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Navigation
            className='h-4 w-4 text-muted-foreground'
            style={{ transform: `rotate(${heading}deg)` }}
          />
          <span className='font-semibold tabular-nums'>{Math.round(((heading % 360) + 360) % 360)}°</span>
        </div>
        {typeof bus?.latitude === "number" && typeof bus?.longitude === "number" ? (
          <span className='ml-auto hidden text-xs tabular-nums text-muted-foreground sm:block'>
            {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default GpsStatus;