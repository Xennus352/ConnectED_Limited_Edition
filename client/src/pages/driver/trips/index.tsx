import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BusFront, CheckCircle2, Clock, Flag, RefreshCw } from "lucide-react";

import { useDriverWorkspace, type DriverDataTrip } from "@/components/views/driver/features";
import { TripCard } from "@/components/views/driver/trip-card";
import { TripActions } from "@/components/views/driver/trip-actions";
import { MetricCard } from "@/components/views/driver/metric-card";
import EmptyState from "@/components/views/driver/empty-state";
import { TripCardsSkeleton } from "@/components/views/driver/skeletons";
import { IncidentReportDialog } from "@/components/views/driver/incident-report";
import { useGsapReveal } from "@/hooks/useGsapReveal";
import { Button } from "@/components/ui/button";

type TripFilter = "ALL" | "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const FILTERS: Array<{ key: TripFilter; short: string }> = [
  { key: "ALL", short: "driver_trips.filter_all" },
  { key: "UPCOMING", short: "driver_trips.filter_upcoming" },
  { key: "IN_PROGRESS", short: "driver_trips.filter_in_progress" },
  { key: "COMPLETED", short: "driver_trips.filter_completed" },
  { key: "CANCELLED", short: "driver_trips.filter_cancelled" },
];

const matches = (trip: DriverDataTrip, filter: TripFilter): boolean => {
  switch (filter) {
    case "ALL":
      return true;
    case "UPCOMING":
      return ["SCHEDULED", "READY", "DELAYED"].includes(trip.status);
    case "IN_PROGRESS":
      return trip.status === "IN_PROGRESS";
    case "COMPLETED":
      return trip.status === "COMPLETED";
    case "CANCELLED":
      return trip.status === "CANCELLED";
  }
};

const DriverTripsPage: React.FC = () => {
  const { t } = useTranslation();
  const workspace = useDriverWorkspace();
  const root = useGsapReveal<HTMLDivElement>();

  const [filter, setFilter] = React.useState<TripFilter>("ALL");
  const [incidentOpen, setIncidentOpen] = React.useState(false);

  const trips = workspace.trips;
  const shown = trips.filter((trip) => matches(trip, filter));

  const inProgress = trips.filter((trip) => trip.status === "IN_PROGRESS").length;
  const completed = trips.filter((trip) => trip.status === "COMPLETED").length;
  const totalDistance =
    trips
      .filter((trip) => typeof trip.distanceKm === "number")
      .reduce((sum, trip) => sum + (trip.distanceKm ?? 0), 0) || null;

  return (
    <div ref={root} className='flex flex-col gap-5'>
      {/* Header */}
      <div data-gsap='fade-up' className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("driver_trips.title")}
          </h1>
          <p className='mt-0.5 text-sm text-muted-foreground'>
            {workspace.assigned
              ? `${workspace.assigned.busNumber}${workspace.assigned.name ? ` · ${workspace.assigned.name}` : ""}`
              : t("driver_trips.no_bus")}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' className='gap-1.5' onClick={workspace.refetch}>
            <RefreshCw className='h-3.5 w-3.5' />
            {t("driver_trips.refresh")}
          </Button>
          <Button
            variant='secondary'
            size='sm'
            className='gap-1.5'
            disabled={!workspace.hasAssignedBus}
            onClick={() => setIncidentOpen(true)}
          >
            <AlertTriangle className='h-3.5 w-3.5' />
            {t("driver_trips.report_incident")}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div data-gsap-stagger className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <MetricCard
          icon={<BusFront className='h-4 w-4' />}
          label={t("driver_trips.metric_total")}
          value={trips.length}
          tone='primary'
        />
        <MetricCard
          icon={<Flag className='h-4 w-4' />}
          label={t("driver_trips.metric_in_progress")}
          value={inProgress}
          tone={inProgress > 0 ? "success" : "primary"}
        />
        <MetricCard
          icon={<CheckCircle2 className='h-4 w-4' />}
          label={t("driver_trips.metric_completed")}
          value={completed}
          tone='info'
        />
        <MetricCard
          icon={<Clock className='h-4 w-4' />}
          label={t("driver_trips.metric_distance")}
          value={totalDistance != null ? `${totalDistance.toFixed(1)} km` : "—"}
          tone='warning'
        />
      </div>

      {/* Filters */}
      <div data-gsap='fade-up' className='flex flex-wrap gap-2'>
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type='button'
            onClick={() => setFilter(item.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filter === item.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(item.short)}
          </button>
        ))}
      </div>

      {/* Trips */}
      {workspace.loadingTrips ? (
        <TripCardsSkeleton count={4} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Clock className='h-7 w-7' />}
          title={t("driver_trips.no_trips")}
          description={t("driver_trips.no_trips_desc")}
        />
      ) : (
        <div data-gsap-stagger className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {shown.map((trip) => (
            <TripCard
              key={trip._id}
              trip={trip}
              actions={
                <TripActions
                  trip={trip}
                  actions={workspace.actions}
                  completion={{
                    stopsCompleted: (workspace.geo?.currentIndex ?? 0) + 1,
                    stopsTotal: (workspace.assigned?.route?.stops ?? []).length || undefined,
                    distanceKm: workspace.geo?.travelledKm ?? trip.distanceKm ?? null,
                    startedAt: trip.actualStartAt ?? null,
                  }}
                />
              }
            />
          ))}
        </div>
      )}

      <IncidentReportDialog
        open={incidentOpen}
        onOpenChange={setIncidentOpen}
        reportIncident={workspace.actions.reportIncident}
      />
    </div>
  );
};

export default DriverTripsPage;