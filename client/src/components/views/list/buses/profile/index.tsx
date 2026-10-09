import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bus as BusIcon,
  Gauge,
  Fuel as FuelIcon,
  ShieldAlert,
  Wrench,
  CalendarClock,
} from "lucide-react";

import useAxiosInstance from "@/api";
import useQueryHandler from "@/hooks/useQueryHandler";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StatusBadge,
  BlockingBadge,
  DateText,
  MoneyText,
} from "@/components/views/list/shared/fleet-badges";
import { useNavigate } from "react-router-dom";

const useBusProfileQueries = (busId: string) => {
  const $axios = useAxiosInstance();

  const getBus = useQueryHandler({
    queryKey: ["bus-profile", busId],
    queryFn: async () => {
      const response = await $axios.get(`/buses/${busId}`);
      return response?.data?.data;
    },
  });

  const getTrips = useQueryHandler({
    queryKey: ["bus-profile", busId, "trips"],
    queryFn: async () => {
      const response = await $axios.get("/trips", {
        params: { bus: busId, limit: 100 },
      });
      return response?.data?.data ?? [];
    },
  });

  const getMaintenance = useQueryHandler({
    queryKey: ["bus-profile", busId, "maintenance"],
    queryFn: async () => {
      const response = await $axios.get("/maintenance", {
        params: { bus: busId, limit: 100 },
      });
      return response?.data?.data ?? [];
    },
  });

  const getFuel = useQueryHandler({
    queryKey: ["bus-profile", busId, "fuel"],
    queryFn: async () => {
      const response = await $axios.get("/fuel", {
        params: { bus: busId, limit: 100 },
      });
      return response?.data?.data ?? [];
    },
  });

  const getIncidents = useQueryHandler({
    queryKey: ["bus-profile", busId, "incidents"],
    queryFn: async () => {
      const response = await $axios.get("/incidents", {
        params: { bus: busId, limit: 100 },
      });
      return response?.data?.data ?? [];
    },
  });

  return { getBus, getTrips, getMaintenance, getFuel, getIncidents };
};

const LabeledValue: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <div className='text-xs text-muted-foreground uppercase tracking-wide'>
      {label}
    </div>
    <div className='text-sm font-medium break-words'>{children || "—"}</div>
  </div>
);

const BusProfileView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { busId = "" } = useParams();
  const { getBus, getTrips, getMaintenance, getFuel, getIncidents } =
    useBusProfileQueries(busId);

  const { data: bus, isLoading: busLoading } = getBus;
  const { data: trips = [] } = getTrips;
  const { data: maintenance = [] } = getMaintenance;
  const { data: fuel = [] } = getFuel;
  const { data: incidents = [] } = getIncidents;

  if (busLoading) {
    return <Skeleton className='h-64 w-full' />;
  }

  if (!bus) {
    return (
      <div className='flex flex-col items-center gap-3 py-16 text-muted-foreground'>
        <BusIcon className='h-10 w-10' />
        <p>{t("bus_form.bus_not_found")}</p>
        <Button variant='outline' onClick={() => navigate("/list/buses")}>
          {t("bus_form.back_to_buses")}
        </Button>
      </div>
    );
  }

  const completedTrips = trips.filter(
    (trip: any) => trip.status === "COMPLETED"
  ).length;
  const activeMaintenance = maintenance.filter((record: any) =>
    ["REPORTED", "APPROVED", "SCHEDULED", "IN_PROGRESS"].includes(record.status)
  ).length;
  const openIncidents = incidents.filter(
    (incident: any) => incident.status !== "RESOLVED"
  ).length;
  const fuelCost = fuel.reduce(
    (sum: number, record: any) => sum + (Number(record.totalCost) || 0),
    0
  );

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-3'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => navigate("/list/buses")}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div className='flex items-center gap-2 flex-wrap'>
          <h2 className='text-2xl font-bold'>
            <span className='inline-flex items-center gap-2'>
              <BusIcon className='h-5 w-5 text-muted-foreground' />
              {bus.busNumber}
            </span>
          </h2>
          {bus.name && (
            <span className='text-muted-foreground'>{bus.name}</span>
          )}
          <StatusBadge status={bus.status} />
          {bus.isActive ? (
            <Badge variant='outline' className='bg-emerald-500/15 text-emerald-600 border-emerald-500/30'>
              {t("bus_form.active")}
            </Badge>
          ) : (
            <Badge variant='outline' className='bg-rose-500/15 text-rose-600 border-rose-500/30'>
              {t("bus_form.archived")}
            </Badge>
          )}
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("bus_form.total_trips")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>{trips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("bus_form.completed_trips")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>{completedTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("bus_form.open_maintenance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {activeMaintenance}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              {t("bus_form.open_incidents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>{openIncidents}</div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <Gauge className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.vehicle_info")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='grid grid-cols-2 gap-3'>
            <LabeledValue label={t("bus_form.registrationNumber")}>
              {bus.registrationNumber}
            </LabeledValue>
            <LabeledValue label={t("bus_form.capacity")}>
              {bus.capacity}
            </LabeledValue>
            <LabeledValue label={t("bus_form.make")}>{bus.make}</LabeledValue>
            <LabeledValue label={t("bus_form.model")}>{bus.model}</LabeledValue>
            <LabeledValue label={t("bus_form.year")}>{bus.year}</LabeledValue>
            <LabeledValue label={t("bus_form.color")}>{bus.color}</LabeledValue>
            <LabeledValue label={t("bus_form.vehicleType")}>
              {bus.vehicleType}
            </LabeledValue>
            <LabeledValue label={t("bus_form.fuelType")}>{bus.fuelType}</LabeledValue>
            <LabeledValue label={t("bus_form.mileage")}>{bus.mileage}</LabeledValue>
            <LabeledValue label={t("bus_form.status")}>{bus.status}</LabeledValue>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <ShieldAlert className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.assignment")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <LabeledValue label={t("bus_form.driver")}>
              {bus.driver?.fullName || "—"}
            </LabeledValue>
            <LabeledValue label={t("bus_form.route")}>
              {bus.route?.name || "—"}
            </LabeledValue>
            {bus.route && (
              <>
                <LabeledValue label={t("bus_form.route_path")}>
                  {bus.route.startLocation || "—"} → {bus.route.endLocation || "—"}
                </LabeledValue>
                <LabeledValue label={t("bus_form.route_description")}>
                  {bus.route.description || "—"}
                </LabeledValue>
              </>
            )}
            <LabeledValue label={t("bus_form.last_location")}>
              {bus.latitude !== null && bus.latitude !== undefined
                ? `${Number(bus.latitude).toFixed(4)}, ${Number(bus.longitude).toFixed(4)}`
                : "—"}
            </LabeledValue>
            <LabeledValue label={t("bus_form.last_location_at")}>
              <DateText value={bus.lastLocationAt} />
            </LabeledValue>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <CalendarClock className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.documents")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='grid grid-cols-2 gap-3'>
            <LabeledValue label={t("bus_form.insuranceProvider")}>
              {bus.insuranceProvider}
            </LabeledValue>
            <LabeledValue label={t("bus_form.insurancePolicyNumber")}>
              {bus.insurancePolicyNumber}
            </LabeledValue>
            <LabeledValue label={t("bus_form.insuranceExpiresAt")}>
              <DateText value={bus.insuranceExpiresAt} />
            </LabeledValue>
            <LabeledValue label={t("bus_form.nextInspectionDueAt")}>
              <DateText value={bus.nextInspectionDueAt} />
            </LabeledValue>
            <LabeledValue label={t("bus_form.registrationExpiresAt")}>
              <DateText value={bus.registrationExpiresAt} />
            </LabeledValue>
            <LabeledValue label={t("bus_form.purchasePrice")}>
              <MoneyText value={bus.purchasePrice} prefix='$ ' />
            </LabeledValue>
            <LabeledValue label={t("bus_form.notes")}>
              {bus.notes}
            </LabeledValue>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <CalendarClock className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.recent_trips")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trips.length === 0 ? (
              <p className='text-sm text-muted-foreground'>{t("bus_form.no_trips")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("data-table.columns.trips_status")}</TableHead>
                    <TableHead>{t("data-table.columns.trips_tripType")}</TableHead>
                    <TableHead>{t("data-table.columns.trips_scheduledStartAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.slice(0, 5).map((trip: any) => (
                    <TableRow key={trip._id}>
                      <TableCell><StatusBadge status={trip.status} /></TableCell>
                      <TableCell className='capitalize'>{trip.tripType}</TableCell>
                      <TableCell><DateText value={trip.scheduledStartAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <Wrench className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.recent_maintenance")} — ${maintenance
                  .reduce(
                    (sum: number, record: any) =>
                      sum + (Number(record.totalCost) || 0),
                    0
                  )
                  .toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maintenance.length === 0 ? (
              <p className='text-sm text-muted-foreground'>{t("bus_form.no_maintenance")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("data-table.columns.maintenance_ticketNumber")}</TableHead>
                    <TableHead>{t("data-table.columns.maintenance_status")}</TableHead>
                    <TableHead>{t("data-table.columns.maintenance_blocksOperation")}</TableHead>
                    <TableHead>{t("data-table.columns.maintenance_totalCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.slice(0, 5).map((record: any) => (
                    <TableRow key={record._id}>
                      <TableCell className='font-medium'>{record.ticketNumber}</TableCell>
                      <TableCell><StatusBadge status={record.status} /></TableCell>
                      <TableCell><BlockingBadge blocking={record.blocksOperation} /></TableCell>
                      <TableCell><MoneyText value={record.totalCost} prefix='$ ' /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <FuelIcon className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.fuel_history")} — ${fuelCost.toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fuel.length === 0 ? (
              <p className='text-sm text-muted-foreground'>{t("bus_form.no_fuel")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("data-table.columns.fuel_date")}</TableHead>
                    <TableHead>{t("data-table.columns.fuel_liters")}</TableHead>
                    <TableHead>{t("data-table.columns.fuel_totalCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuel.slice(0, 5).map((record: any) => (
                    <TableRow key={record._id}>
                      <TableCell><DateText value={record.date} /></TableCell>
                      <TableCell className='tabular-nums'>{record.liters} L</TableCell>
                      <TableCell><MoneyText value={record.totalCost} prefix='$ ' /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <ShieldAlert className='h-4 w-4 text-muted-foreground' />
                {t("bus_form.incident_history")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className='text-sm text-muted-foreground'>{t("bus_form.no_incidents")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("data-table.columns.incidents_type")}</TableHead>
                    <TableHead>{t("data-table.columns.incidents_severity")}</TableHead>
                    <TableHead>{t("data-table.columns.incidents_status")}</TableHead>
                    <TableHead>{t("data-table.columns.incidents_occurredAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.slice(0, 5).map((incident: any) => (
                    <TableRow key={incident._id}>
                      <TableCell className='capitalize'>
                        {String(incident.type).toLowerCase().replace(/_/g, " ")}
                      </TableCell>
                      <TableCell><StatusBadge status={incident.severity} /></TableCell>
                      <TableCell><StatusBadge status={incident.status} /></TableCell>
                      <TableCell><DateText value={incident.occurredAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusProfileView;