import React from "react";
import { useTranslation } from "react-i18next";
import { Bus as BusIcon, ClipboardList, Users } from "lucide-react";

import { useDriverService } from "@/services/transport";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, DateText } from "@/components/views/list/shared/fleet-badges";

const DriverBoardingPage: React.FC = () => {
  const { t } = useTranslation();
  const { getMyTrips, getMyBus } = useDriverService();
  const { data, isLoading } = getMyTrips;
  const { data: myBus } = getMyBus;

  const trips = data?.data ?? [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTrips = trips.filter((trip: any) => {
    const date = trip.scheduledStartAt ? new Date(trip.scheduledStartAt) : null;
    return date && date.getTime() >= todayStart.getTime();
  });

  const stops = myBus?.route?.stops ?? [];
  const totalRiders = stops.reduce(
    (sum: number, stop: any) =>
      typeof stop.studentCount === "number" ? sum + stop.studentCount : sum,
    0
  );

  if (isLoading) return <Skeleton className='h-64 w-full' />;

  if (!myBus) {
    return (
      <div className='flex flex-col items-center gap-3 py-16 text-muted-foreground'>
        <BusIcon className='h-10 w-10' />
        <p>{t("driver_boarding.no_bus")}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-2 flex-wrap'>
        <h2 className='text-2xl font-bold'>{t("driver_boarding.title")}</h2>
        <span className='text-muted-foreground'>
          {myBus.busNumber} · {myBus.name || myBus.route?.name || ""}
        </span>
        <StatusBadge status={myBus.status} />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("driver_boarding.today_trips")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>{todayTrips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("driver_boarding.students_assigned")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {myBus.studentCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("driver_boarding.riders_at_stops")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>{totalRiders}</div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <ClipboardList className='h-4 w-4 text-muted-foreground' />
                {t("driver_boarding.today_schedule")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTrips.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                {t("driver_boarding.no_today_trips")}
              </p>
            ) : (
              <ul className='flex flex-col gap-2'>
                {todayTrips.map((trip: any) => (
                  <li
                    key={trip._id}
                    className='flex items-center justify-between gap-3 rounded-lg border p-3'
                  >
                    <div>
                      <div className='text-sm font-medium capitalize'>
                        {t(`driver_trips.type_${String(trip.tripType).toLowerCase()}`)}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {trip.route?.name || "—"}
                      </div>
                    </div>
                    <div className='text-right'>
                      <StatusBadge status={trip.status} />
                      <div className='mt-1 text-xs text-muted-foreground'>
                        <DateText value={trip.scheduledStartAt} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <Users className='h-4 w-4 text-muted-foreground' />
                {t("driver_boarding.stop_riders")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stops.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                {t("driver_boarding.no_stops")}
              </p>
            ) : (
              <ul className='flex flex-col gap-2'>
                {stops.map((stop: any, index: number) => (
                  <li
                    key={stop.id}
                    className='flex items-center justify-between rounded-lg border p-3'
                  >
                    <span className='flex items-center gap-2 text-sm'>
                      <span className='w-5 text-xs text-muted-foreground'>
                        #{index + 1}
                      </span>
                      {stop.name}
                    </span>
                    <span className='tablular-nums text-sm font-medium'>
                      {typeof stop.studentCount === "number"
                        ? stop.studentCount
                        : "—"}{" "}
                      <span className='text-xs text-muted-foreground'>
                        {t("driver_boarding.riders_short")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverBoardingPage;