import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bus as BusIcon,
  ChevronRight,
  Route as RouteIcon,
  Users,
  Wrench,
} from "lucide-react";

import { useDriverWorkspace } from "@/components/views/driver/features";
import BusStatusCard from "@/components/views/driver/bus-status-card";
import GpsStatus from "@/components/views/driver/gps-status";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import EmptyState from "@/components/views/driver/empty-state";
import { MapPageSkeleton } from "@/components/views/driver/skeletons";
import { Button } from "@/components/ui/button";

const DriverBusPage: React.FC = () => {
  const { t } = useTranslation();
  const workspace = useDriverWorkspace();
  const bus = workspace.assigned;

  if (workspace.loadingBus) return <MapPageSkeleton />;

  if (!bus) {
    return (
      <div className='flex flex-col gap-4'>
        <EmptyState
          icon={<BusIcon className='h-7 w-7' />}
          title={t("driver_bus.no_bus")}
          description={t("driver_bus.no_bus_desc")}
          action={
            <Button variant='outline' onClick={workspace.refetch}>
              {t("driver_common.try_again")}
            </Button>
          }
        />
      </div>
    );
  }

  const gpsStatus = workspace.freshness;
  const blockingMaintenance = (bus as any).hasBlockingMaintenance === true;
  const occupancy = bus.studentCount ?? 0;
  const capacity = bus.capacity || 0;
  const occupancyPct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
  const stops = bus.route?.stops ?? [];

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("driver_bus.title")}
          </h1>
          <p className='mt-0.5 text-sm text-muted-foreground'>
            {bus.busNumber}
            {bus.name ? ` · ${bus.name}` : ""}
          </p>
        </div>
        <LiveStatusBadge status={gpsStatus} size='sm' />
      </div>

      {/* Maintenance restriction banner (real server flag) */}
      {blockingMaintenance ? (
        <div className='flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm'>
          <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400'>
            <Wrench className='h-4 w-4' />
          </span>
          <div>
            <div className='font-semibold'>{t("driver_bus.maintenance_blocked")}</div>
            <p className='mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/80'>
              {t("driver_bus.maintenance_blocked_desc")}
            </p>
          </div>
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        {/* Vehicle overview */}
        <div className='flex flex-col gap-4 lg:col-span-2'>
          <BusStatusCard
            bus={bus}
            status={gpsStatus}
            tripStatusLabel={
              workspace.currentTrip
                ? t(`driver_statuses.${workspace.currentTrip.status.toLowerCase()}`)
                : null
            }
            lastUpdateLabel={
              bus.lastLocationAt
                ? new Date(bus.lastLocationAt).toLocaleTimeString()
                : null
            }
          />
          <GpsStatus bus={bus} status={gpsStatus} compact={false} />

          {/* Occupancy */}
          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <div className='flex items-center justify-between'>
              <h2 className='flex items-center gap-2 text-base font-semibold'>
                <Users className='h-4 w-4 text-muted-foreground' />
                {t("driver_bus.students")}
              </h2>
              <span className='text-sm font-bold tabular-nums'>
                {occupancy}
                <span className='font-normal text-muted-foreground'> / {capacity || "—"}</span>
              </span>
            </div>
            <div className='mt-3 h-2.5 overflow-hidden rounded-full bg-muted'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-700'
                style={{ width: `${Math.min(100, occupancyPct)}%` }}
              />
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>
              {t("driver_bus.students_on_bus")}
            </p>
          </div>
        </div>

        {/* Vehicle + route details */}
        <div className='flex flex-col gap-4'>
          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_bus.vehicle")}</h2>
            <dl className='mt-3 space-y-2.5 text-sm'>
              <DetailRow label={t("driver_bus.registration")} value={bus.registrationNumber || "—"} />
              <DetailRow label={t("driver_bus.capacity")} value={capacity || "—"} />
              <DetailRow label={t("driver_bus.status")} value={String(bus.status || "—").toLowerCase()} />
              <DetailRow
                label={t("driver_bus.last_location_at")}
                value={bus.lastLocationAt ? new Date(bus.lastLocationAt).toLocaleString() : "—"}
              />
            </dl>
          </div>

          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_bus.route")}</h2>
            {bus.route ? (
              <>
                <div className='mt-3 text-sm'>
                  <div className='font-semibold'>{bus.route.name}</div>
                  <div className='text-muted-foreground'>
                    {bus.route.startLocation} → {bus.route.endLocation}
                  </div>
                </div>
                <div className='mt-3 text-xs text-muted-foreground'>
                  {t("driver_bus.stops_count", { count: stops.length })}
                  {typeof bus.route.estimatedDuration === "number" && bus.route.estimatedDuration > 0
                    ? ` · ${t("driver_bus.duration")}: ${bus.route.estimatedDuration} min`
                    : ""}
                </div>
                <div className='mt-4 flex flex-col gap-2'>
                  <Button variant='outline' size='sm' className='justify-between gap-2' asChild>
                    <Link to='/driver/route'>
                      {t("driver_bus.open_route")}
                      <ChevronRight className='h-4 w-4' />
                    </Link>
                  </Button>
                  <Button variant='ghost' size='sm' className='justify-between gap-2 text-muted-foreground' asChild>
                    <Link to='/driver/stops'>
                      {t("driver_bus.open_stops")}
                      <ChevronRight className='h-4 w-4' />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className='mt-3 text-sm text-muted-foreground'>{t("driver_bus.no_route")}</p>
            )}
          </div>

          {/* Stops preview */}
          {stops.length > 0 ? (
            <div className='rounded-2xl border bg-card p-5 shadow-sm'>
              <h2 className='flex items-center gap-2 text-base font-semibold'>
                <RouteIcon className='h-4 w-4 text-muted-foreground' />
                {t("driver_bus.stops")}
              </h2>
              <ul className='mt-3 space-y-2'>
                {stops.slice(0, 5).map((stop: any) => (
                  <li key={stop.id} className='flex items-center gap-2 text-sm'>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        stop.isActive === false ? "bg-muted" : "bg-primary/60"
                      }`}
                    />
                    <span className='truncate'>{stop.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className='flex items-center justify-between gap-3'>
    <span className='text-muted-foreground'>{label}</span>
    <span className='text-right font-medium'>{value}</span>
  </div>
);

export default DriverBusPage;