import React from "react";
import { useTranslation } from "react-i18next";
import { AlarmClock, CalendarDays, Clock, Route } from "lucide-react";

import { StatusBadge, DateText } from "@/components/views/list/shared/fleet-badges";
import { Card, CardContent } from "@/components/ui/card";
import type { DriverDataTrip } from "./features";

interface TripCardProps {
  trip: DriverDataTrip;
  /** Compact layout for dashboard lists. */
  compact?: boolean;
  /** Extra action area (usually <TripActions/>). */
  actions?: React.ReactNode;
  className?: string;
}

const typeKey = (trip: DriverDataTrip): string =>
  `driver_trips.type_${String(trip.tripType || "custom").toLowerCase()}`;

/** Modern trip card: status, schedule, route, delay/distance and actions. */
export const TripCard: React.FC<TripCardProps> = ({
  trip,
  compact = false,
  actions,
  className = "",
}) => {
  const { t } = useTranslation();
  const route = trip.route;

  return (
    <Card className={`border shadow-sm ${compact ? "" : "hover:shadow-md"} ${className}`}>
      <CardContent className={compact ? "p-3.5" : "p-4"}>
        <div className='flex items-center justify-between gap-2'>
          <StatusBadge status={trip.status} />
          <span className='flex items-center gap-1 text-xs text-muted-foreground'>
            <CalendarDays className='h-3.5 w-3.5' />
            <span className='capitalize'>{t(typeKey(trip))}</span>
          </span>
        </div>

        <div className={`mt-3 flex items-start gap-2 ${compact ? "text-sm" : "text-base"}`}>
          <Route className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
          <div className='min-w-0'>
            {route ? (
              <>
                <div className='font-semibold leading-snug'>{route.name || "—"}</div>
                <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                  <span className='truncate'>{route.startLocation}</span>
                  <span>→</span>
                  <span className='truncate'>{route.endLocation}</span>
                </div>
              </>
            ) : (
              <span className='text-muted-foreground'>—</span>
            )}
          </div>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Clock className='h-3.5 w-3.5' />
            <DateText value={trip.scheduledStartAt} />
          </span>
          {trip.delayMinutes ? (
            <span className='flex items-center gap-1 font-medium text-amber-600 dark:text-amber-500'>
              <AlarmClock className='h-3.5 w-3.5' />
              {t("driver_trips.delayed_by", { minutes: trip.delayMinutes })}
            </span>
          ) : null}
          {trip.distanceKm != null ? (
            <span className='tabular-nums'>{trip.distanceKm.toFixed(1)} km</span>
          ) : null}
        </div>

        {trip.notes ? (
          <p className='mt-2 truncate text-xs text-muted-foreground'>{trip.notes}</p>
        ) : null}

        {actions ? <div className='mt-4'>{actions}</div> : null}
      </CardContent>
    </Card>
  );
};

export default TripCard;