import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Route as RouteIcon } from "lucide-react";

import { useDriverWorkspace } from "@/components/views/driver/features";
import { RouteTimeline, type TimelineStop } from "@/components/views/driver/route-timeline";
import { TripProgress } from "@/components/views/driver/trip-progress";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import EmptyState from "@/components/views/driver/empty-state";
import { RouteTimelineSkeleton } from "@/components/views/driver/skeletons";
import { Button } from "@/components/ui/button";

const DriverStopsPage: React.FC = () => {
  const { t } = useTranslation();
  const workspace = useDriverWorkspace();
  const bus = workspace.assigned;
  const route = bus?.route;

  if (workspace.loadingBus) return <RouteTimelineSkeleton />;

  if (!bus || !route || (route.stops ?? []).length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <EmptyState
          icon={<MapPin className='h-7 w-7' />}
          title={t("driver_stops.no_stops")}
          description={t("driver_stops.no_stops_desc")}
          action={
            <Button variant='outline' onClick={workspace.refetch}>
              {t("driver_common.try_again")}
            </Button>
          }
        />
      </div>
    );
  }

  const stops = (route.stops ?? []).filter((stop: any) => stop.isActive !== false);
  const completed = workspace.geo ? (workspace.geo.currentIndex ?? -1) + 1 : 0;

  const timeline: TimelineStop[] = stops.map((stop: any, index: number) => {
    const state =
      !workspace.geo
        ? "upcoming"
        : index < (workspace.geo.currentIndex ?? 0)
          ? "completed"
          : index === (workspace.geo.currentIndex ?? 0)
            ? "current"
            : "upcoming";
    return {
      id: stop.id,
      name: stop.name,
      state,
      time:
        typeof stop.estimatedArrival === "number" && stop.estimatedArrival > 0
          ? t("driver_stops.arrival_min", { minutes: stop.estimatedArrival })
          : null,
      detail:
        state === "current"
          ? t("driver_common.currently_here")
          : state === "completed"
            ? t("driver_stops.visited")
            : null,
    };
  });

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("driver_stops.title")}
          </h1>
          <p className='mt-0.5 flex items-center gap-2 text-sm text-muted-foreground'>
            <RouteIcon className='h-4 w-4' />
            <span className='font-semibold text-foreground'>{route.name}</span>
            <span>{route.startLocation} → {route.endLocation}</span>
          </p>
        </div>
        <LiveStatusBadge
          status={workspace.currentTrip ? workspace.freshness : "NONE"}
          size='sm'
        />
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        {/* Timeline */}
        <section className='rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>{t("driver_stops.stop_list")}</h2>
            <span className='text-xs text-muted-foreground'>
              {t("driver_stops.completed_count", {
                completed: Math.max(0, Math.min(completed, stops.length)),
                total: stops.length,
              })}
            </span>
          </div>
          <RouteTimeline stops={timeline} />
        </section>

        {/* Summary */}
        <aside className='flex flex-col gap-4'>
          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_common.route_progress")}</h2>
            <div className='mt-3'>
              <TripProgress
                stops={timeline.map((stop) => ({
                  name: stop.name,
                  state: stop.state,
                  id: stop.id,
                }))}
                fraction={workspace.geo?.fraction ?? 0}
                active={workspace.currentTrip?.status === "IN_PROGRESS"}
              />
            </div>
          </div>

          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_stops.summary")}</h2>
            <dl className='mt-3 space-y-2 text-sm'>
              <InfoRow
                label={t("driver_stops.total")}
                value={stops.length}
              />
              <InfoRow label={t("driver_stops.completed")} value={completed} />
              <InfoRow
                label={t("driver_stops.remaining")}
                value={Math.max(0, stops.length - completed)}
              />
              <InfoRow
                label={t("driver_stops.route_length")}
                value={workspace.geo?.totalKm != null ? `${workspace.geo.totalKm.toFixed(1)} km` : "—"}
              />
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className='flex items-center justify-between gap-3'>
    <span className='text-muted-foreground'>{label}</span>
    <span className='font-medium tabular-nums'>{value}</span>
  </div>
);

export default DriverStopsPage;