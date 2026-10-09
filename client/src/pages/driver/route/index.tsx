import React from "react";
import { useTranslation } from "react-i18next";
import { Route as RouteIcon } from "lucide-react";

import { useDriverWorkspace } from "@/components/views/driver/features";
import { RouteTimeline, type TimelineStop } from "@/components/views/driver/route-timeline";
import { TripProgress } from "@/components/views/driver/trip-progress";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import EmptyState from "@/components/views/driver/empty-state";
import { RouteTimelineSkeleton } from "@/components/views/driver/skeletons";
import { Button } from "@/components/ui/button";

const DriverRoutePage: React.FC = () => {
  const { t } = useTranslation();
  const workspace = useDriverWorkspace();
  const bus = workspace.assigned;
  const route = bus?.route;

  if (workspace.loadingBus) return <RouteTimelineSkeleton />;

  if (!bus || !route) {
    return (
      <div className='flex flex-col gap-4'>
        <EmptyState
          icon={<RouteIcon className='h-7 w-7' />}
          title={t("driver_route.no_route")}
          description={t("driver_route.no_route_desc")}
          action={
            <Button variant='outline' onClick={workspace.refetch}>
              {t("driver_common.try_again")}
            </Button>
          }
        />
      </div>
    );
  }

  const stops = route.stops ?? [];
  const timelineStops: TimelineStop[] = stops.map((stop: any, index: number) => {
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
          ? t("driver_route.arrival_min", { minutes: stop.estimatedArrival })
          : null,
      detail:
        state === "current"
          ? t("driver_route.current_stop_hint")
          : state === "completed"
            ? t("driver_route.completed")
            : null,
    };
  });

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("driver_route.title")}
          </h1>
          <p className='mt-0.5 flex items-center gap-2 text-sm text-muted-foreground'>
            <span className='font-semibold text-foreground'>{route.name}</span>
            <span>
              {route.startLocation} → {route.endLocation}
            </span>
          </p>
        </div>
        <LiveStatusBadge
          status={workspace.currentTrip ? workspace.freshness : "NONE"}
          size='sm'
        />
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <section className='rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>{t("driver_route.timeline")}</h2>
            {workspace.currentTrip ? (
              <span className='rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400'>
                {t("driver_statuses.in_progress")}
              </span>
            ) : null}
          </div>

          {timelineStops.length === 0 ? (
            <p className='py-10 text-center text-sm text-muted-foreground'>
              {t("driver_route.no_stops")}
            </p>
          ) : (
            <RouteTimeline stops={timelineStops} />
          )}
        </section>

        <aside className='flex flex-col gap-4'>
          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_common.route_progress")}</h2>
            <div className='mt-3'>
              <TripProgress
                stops={timelineStops.map((stop) => ({
                  name: stop.name,
                  state: stop.state,
                  id: stop.id,
                }))}
                fraction={workspace.geo?.fraction ?? 0}
                active={workspace.currentTrip?.status === "IN_PROGRESS"}
              />
            </div>
            {workspace.geo?.totalKm ? (
              <p className='mt-3 text-xs text-muted-foreground'>
                {t("driver_route.estimate_note")}
              </p>
            ) : null}
          </div>

          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_route.route_info")}</h2>
            <dl className='mt-3 space-y-2 text-sm'>
              <InfoRow label={t("driver_route.stops_count")} value={stops.length} />
              <InfoRow
                label={t("driver_route.estimated_duration")}
                value={
                  typeof route.estimatedDuration === "number" && route.estimatedDuration > 0
                    ? t("driver_route.minutes", { minutes: route.estimatedDuration })
                    : "—"
                }
              />
              <InfoRow
                label={t("driver_route.route_length")}
                value={
                  workspace.geo?.totalKm != null
                    ? `${workspace.geo.totalKm.toFixed(1)} km`
                    : "—"
                }
              />
              <InfoRow label={t("driver_route.active_stops")} value={stops.filter((s: any) => s.isActive !== false).length} />
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

export default DriverRoutePage;