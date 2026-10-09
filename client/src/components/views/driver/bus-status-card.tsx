import React from "react";
import { useTranslation } from "react-i18next";
import { BusFront, Users, Wifi } from "lucide-react";
import type { FleetBus } from "@/features/fleet/types";
import { formatSpeed } from "@/features/fleet/freshness";
import LiveStatusBadge, { type LiveStatusVariant } from "./live-status-badge";

interface BusStatusCardProps {
  bus: FleetBus | null;
  /** GPS freshness of the bus. */
  status: LiveStatusVariant;
  /** Current trip status label key (optional). */
  tripStatusLabel?: string | null;
  /** Age of the last GPS fix in seconds (optional). */
  lastUpdateLabel?: string | null;
  className?: string;
}

/** Premium vehicle status card — the "where is my bus" answer at a glance. */
export const BusStatusCard: React.FC<BusStatusCardProps> = ({
  bus,
  status,
  tripStatusLabel,
  lastUpdateLabel,
  className = "",
}) => {
  const { t } = useTranslation();
  if (!bus) return null;

  const occupancy = bus.studentCount ?? 0;
  const capacity = bus.capacity || 0;
  const occupancyPct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;

  return (
    <div className={`overflow-hidden rounded-xl border bg-card shadow-sm ${className}`}>
      <div className='flex items-center justify-between gap-3 border-b bg-gradient-to-br from-primary/5 to-transparent px-4 py-3'>
        <div className='flex items-center gap-3'>
          <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <BusFront className='h-6 w-6' />
          </span>
          <div>
            <div className='text-base font-bold leading-tight'>{bus.busNumber}</div>
            {bus.name ? (
              <div className='truncate text-xs text-muted-foreground'>{bus.name}</div>
            ) : null}
          </div>
        </div>
        <LiveStatusBadge status={status} size='sm' />
      </div>

      <div className='grid grid-cols-2 gap-px bg-border'>
        <Cell icon={<Wifi className='h-4 w-4' />} label={t("driver_common.gps")}>
          <span className='font-semibold'>
            {status === "LIVE" ? t("driver_common.connected") : t("driver_common.last_update")}
          </span>
        </Cell>
        <Cell icon={<span className='text-xs font-bold'>⚡</span>} label={t("driver_common.speed")}>
          <span className='font-semibold tabular-nums'>{formatSpeed(bus.speed)}</span>
        </Cell>
        <Cell icon={<Users className='h-4 w-4' />} label={t("driver_common.passengers")}>
          <span className='font-semibold tabular-nums'>
            {occupancy} <span className='text-muted-foreground'>/ {capacity}</span>
          </span>
          {capacity > 0 ? (
            <span className='ml-1 text-[11px] text-muted-foreground'>({occupancyPct}%)</span>
          ) : null}
        </Cell>
        <Cell icon={<span className='text-xs font-bold'>🗺</span>} label={t("driver_common.trip")}>
          <span className='max-w-[9rem] truncate font-semibold'>
            {tripStatusLabel ?? t("driver_common.no_active_trip").toLowerCase()}
          </span>
        </Cell>
      </div>

      <div className='px-4 py-2 text-xs text-muted-foreground'>
        {lastUpdateLabel
          ? `${t("driver_common.last_update")} ${lastUpdateLabel}`
          : t("driver_common.no_fix_yet")}
      </div>
    </div>
  );
};

const Cell: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className='flex flex-col gap-1 bg-card px-4 py-3'>
    <div className='flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
      {icon}
      {label}
    </div>
    {children}
  </div>
);

export default BusStatusCard;