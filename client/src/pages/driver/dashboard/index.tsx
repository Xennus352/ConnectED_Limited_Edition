import React from "react";
import { Link } from "react-router-dom";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, MapPinned, Navigation } from "lucide-react";

import { TUser } from "@/interfaces/user";
import { Button } from "@/components/ui/button";
import { useGsapReveal } from "@/hooks/useGsapReveal";
import {
  useDriverWorkspace,
  type DriverDataTrip,
} from "@/components/views/driver/features";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import BusStatusCard from "@/components/views/driver/bus-status-card";
import GpsStatus from "@/components/views/driver/gps-status";
import { TripProgress, type ProgressStop } from "@/components/views/driver/trip-progress";
import { TripCard } from "@/components/views/driver/trip-card";
import { TripActions } from "@/components/views/driver/trip-actions";
import EmptyState from "@/components/views/driver/empty-state";
import { ErrorState } from "@/components/views/driver/error-state";
import { DashboardSkeleton, TripCardsSkeleton } from "@/components/views/driver/skeletons";
import { buildDriverAlerts } from "@/components/views/driver/alerts";
import type { RouteProgress } from "@/lib/driver-geo";

const greeting = (hour: number): string =>
  hour < 12 ? "driver_dashboard.good_morning" : hour < 17 ? "driver_dashboard.good_afternoon" : "driver_dashboard.good_evening";

const firstName = (fullName: string): string => fullName.split(/\s+/)[0] || fullName;

const DriverDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthUser<TUser>() as TUser | null;
  const workspace = useDriverWorkspace();
  const root = useGsapReveal<HTMLDivElement>();

  const now = new Date();
  const hour = now.getHours();

  const { assigned, currentTrip, nextTrip, freshness, geo, loadingBus, loadingTrips } =
    workspace;
  const focusTrip = currentTrip ?? nextTrip;

  // The bus' route stops mapped to timeline states using the real progress.
  const stops = assigned?.route?.stops ?? [];
  const timelineStops: ProgressStop[] = stops.map((stop: any, index: number) => ({
    id: stop.id,
    name: stop.name,
    state:
      !geo
        ? "upcoming"
        : index < (geo.currentIndex ?? 0)
          ? "completed"
          : index === (geo.currentIndex ?? 0)
            ? "current"
            : "upcoming",
  }));

  const alerts = buildDriverAlerts(workspace).slice(0, 3);
  const tripStatusLabel = currentTrip
    ? t(`driver_statuses.${currentTrip.status.toLowerCase()}`)
    : null;

  // Label the GPS state honestly: no trip → NO ACTIVE TRIP still matters.
  const gpsStatus = assigned
    ? freshness
    : "OFFLINE";

  if (loadingBus && loadingTrips) return <DashboardSkeleton />;

  return (
    <div ref={root} className='flex flex-col gap-5'>
      {/* Greeting ---------------------------------------------------------- */}
      <div data-gsap='fade-up' className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t(greeting(hour))}, <span className='text-primary'>{firstName(user?.fullName || "Driver")}</span> 👋
          </h1>
          <p className='mt-1 flex items-center gap-1.5 text-sm text-muted-foreground'>
            <CalendarDays className='h-4 w-4' />
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className='flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 shadow-sm'>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              workspace.onDuty
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {workspace.onDuty ? "●" : "○"}
          </span>
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${
              workspace.onDuty ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {workspace.onDuty
              ? t("driver_dashboard.on_duty")
              : t("driver_dashboard.off_duty")}
          </span>
        </div>
      </div>

      {workspace.snapshot.isError && !workspace.hasAssignedBus ? (
        <ErrorState
          onRetry={undefined}
          message={t("driver_dashboard.load_failed")}
          description={t("driver_dashboard.load_failed_desc")}
        />
      ) : null}

      {!workspace.hasAssignedBus && !loadingBus ? (
        <EmptyState
          icon={<MapPinned className='h-7 w-7' />}
          title={t("driver_dashboard.no_bus_assigned")}
          description={t("driver_dashboard.no_bus_assigned_desc")}
          action={
            <Button variant='outline' onClick={workspace.refetch}>
              {t("driver_common.try_again")}
            </Button>
          }
        />
      ) : null}

      {/* Hero + side column ------------------------------------------------- */}
      {workspace.hasAssignedBus ? (
        <div data-gsap-stagger className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          {/* Current trip hero */}
          {focusTrip || loadingTrips ? (
            <section
              aria-label={t("driver_dashboard.current_trip")}
              className='relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2'
            >
              <div className='pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-sky-500 opacity-60' />
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
                  {currentTrip
                    ? t("driver_dashboard.current_trip")
                    : t("driver_dashboard.next_trip")}
                </span>
                <LiveStatusBadge
                  status={currentTrip ? freshness : "NONE"}
                  detail={currentTrip ? undefined : undefined}
                  size='sm'
                />
              </div>

              {loadingTrips ? (
                <div className='mt-4 space-y-3'>
                  <div className='h-6 w-24 animate-pulse rounded bg-muted' />
                  <div className='h-5 w-52 animate-pulse rounded bg-muted' />
                  <div className='h-4 w-40 animate-pulse rounded bg-muted' />
                </div>
              ) : focusTrip ? (
                <>
                  <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <span className='rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary'>
                      {assigned?.busNumber || "—"}
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      {focusTrip.route?.startLocation} → {focusTrip.route?.endLocation}
                    </span>
                  </div>

                  <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <StopMini
                      label={t("driver_dashboard.current_stop")}
                      value={geo?.currentStop?.name ?? assignCurrentStopFallback(focusTrip, geo)}
                      icon={<Navigation className='h-3.5 w-3.5' />}
                      emphasis
                    />
                    <StopMini
                      label={t("driver_dashboard.next_stop")}
                      value={geo?.nextStop?.name ?? "—"}
                      icon={<Navigation className='h-3.5 w-3.5 rotate-45 text-muted-foreground' />}
                    />
                  </div>

                  <div className='mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                    {geo?.etaMinutes != null ? (
                      <span className='rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600 dark:text-emerald-400'>
                        {t("driver_dashboard.eta", { minutes: geo.etaMinutes })}
                      </span>
                    ) : null}
                    {currentTrip?.actualStartAt ? (
                      <span>
                        {t("driver_dashboard.started_at")}{" "}
                        {new Date(currentTrip.actualStartAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : null}
                  </div>

                  <div className='mt-5 flex flex-wrap items-center gap-3'>
                    <TripActions
                      trip={focusTrip}
                      actions={workspace.actions}
                      completion={{
                        stopsCompleted: (geo?.currentIndex ?? 0) + 1,
                        stopsTotal: stops.length || undefined,
                        distanceKm: geo?.travelledKm ?? focusTrip?.distanceKm ?? null,
                        startedAt: currentTrip?.actualStartAt ?? null,
                      }}
                      size='lg'
                    />
                    <Button size='lg' variant='outline' className='gap-2' asChild>
                      <Link to='/driver/map'>
                        <MapPinned className='h-4 w-4' />
                        {t("driver_dashboard.open_map")}
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className='mt-6 text-sm text-muted-foreground'>
                  {t("driver_dashboard.no_trips_today")}
                </p>
              )}

              {focusTrip ? (
                <div className='mt-6'>
                  <TripProgress
                    stops={timelineStops}
                    fraction={geo?.fraction ?? 0}
                    active={currentTrip?.status === "IN_PROGRESS"}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Right column */}
          <div className='flex flex-col gap-4'>
            <BusStatusCard
              bus={assigned}
              status={gpsStatus}
              tripStatusLabel={tripStatusLabel}
              lastUpdateLabel={assigned?.lastLocationAt ? new Date(assigned.lastLocationAt).toLocaleTimeString() : null}
            />
            <GpsStatus
              bus={assigned}
              status={gpsStatus}
              clockOffset={0}
              compact={false}
            />
          </div>
        </div>
      ) : null}

      {/* Upcoming trips ------------------------------------------------------ */}
      {workspace.hasAssignedBus ? (
        <section data-gsap='fade-up' className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>{t("driver_dashboard.upcoming_trips")}</h2>
            <Button variant='ghost' size='sm' className='gap-1 text-muted-foreground' asChild>
              <Link to='/driver/trips'>
                {t("driver_common.view_all")}
                <ChevronRight className='h-4 w-4' />
              </Link>
            </Button>
          </div>

          {loadingTrips ? (
            <TripCardsSkeleton count={2} />
          ) : upcomingTrips(workspace.trips).length === 0 ? (
            <p className='rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground'>
              {t("driver_dashboard.no_upcoming_trips")}
            </p>
          ) : (
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              {upcomingTrips(workspace.trips).slice(0, 4).map((trip) => (
                <TripCard
                  key={trip._id}
                  trip={trip}
                  compact
                  actions={
                    <TripActions trip={trip} actions={workspace.actions} />
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Recent alerts -------------------------------------------------------- */}
      <section data-gsap='fade-up' className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>{t("driver_dashboard.recent_alerts")}</h2>
          <Button variant='ghost' size='sm' className='gap-1 text-muted-foreground' asChild>
            <Link to='/driver/alerts'>
              {t("driver_common.view_all")}
              <ChevronRight className='h-4 w-4' />
            </Link>
          </Button>
        </div>
        {alerts.length === 0 ? (
          <p className='rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground'>
            {t("driver_dashboard.no_alerts")}
          </p>
        ) : (
          <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.action === "open-map" ? "/driver/map" : "/driver/alerts"}
                className='driver-alert-enter flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors hover:bg-accent'
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    alert.severity === "critical"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : alert.severity === "warning"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  }`}
                >
                  {alert.category === "GPS" ? "📡" : alert.category === "TRIP" ? "🚌" : alert.category === "MAINTENANCE" ? "🔧" : alert.category === "INCIDENT" ? "⚠️" : "ℹ️"}
                </span>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold'>
                    {t(alert.titleKey, alert.titleValues)}
                  </div>
                  <div className='truncate text-xs text-muted-foreground'>
                    {t(alert.descriptionKey ?? "", alert.descriptionValues)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const StopMini: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}> = ({ label, value, icon, emphasis }) => (
  <div
    className={`rounded-xl border px-3 py-2.5 ${
      emphasis ? "bg-primary/5 border-primary/20" : ""
    }`}
  >
    <div className='flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
      {icon}
      {label}
    </div>
    <div className='mt-0.5 truncate text-sm font-semibold'>{value || "—"}</div>
  </div>
);

/** Honest fallback for the current stop before a GPS fix exists. */
const assignCurrentStopFallback = (
  trip: DriverDataTrip | null,
  geo: RouteProgress | null
): string => {
  if (geo?.currentStop?.name) return geo.currentStop.name;
  return trip?.status === "IN_PROGRESS" && trip.route?.startLocation
    ? trip.route.startLocation
    : "—";
};

const upcomingTrips = (trips: DriverDataTrip[]): DriverDataTrip[] =>
  trips.filter((trip) =>
    ["SCHEDULED", "READY", "DELAYED"].includes(trip.status)
  );

export default DriverDashboardPage;