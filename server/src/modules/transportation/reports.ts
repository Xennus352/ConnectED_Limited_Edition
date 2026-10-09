import { Router, type Request } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest } from "../../lib/errors";
import { readFilter, toDate } from "../../lib/query";
import { mapDoc } from "../../lib/serialize";
import { countMaintenanceRestrictedBuses } from "./availability";

/**
 * Transportation reports — every metric is aggregated on the server from
 * persisted records. The browser never receives raw GPS points or full
 * tables to compute a number by itself.
 *
 * CSV export is generated server-side from the exact same query the JSON
 * endpoint uses, so exports always match the applied filters.
 *
 * PDF export is intentionally not wired: the repository ships no PDF
 * generation library, so claiming a PDF export would be fake. CSV covers the
 * "download a report" requirement.
 */

const round2 = (value: number | null | undefined): number =>
  value == null || !Number.isFinite(value) ? 0 : Math.round(value * 100) / 100;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const minutes = (n: number) => new Date(Date.now() + n * 60 * 1000);

interface Range {
  from?: Date;
  to?: Date;
}

/** from/to with a read-only default of "last 30 days". */
const readRange = (query: Record<string, any>): Range => {
  const rawFrom = toDate(readFilter(query, "from"));
  const rawTo = toDate(readFilter(query, "to"));

  if (rawFrom && rawTo && rawFrom.getTime() > rawTo.getTime()) {
    throw badRequest("Invalid date range: 'from' is after 'to'");
  }

  if (rawFrom && rawTo) {
    return { from: startOfDay(rawFrom), to: endOfDay(rawTo) };
  }
  if (rawFrom) return { from: startOfDay(rawFrom) };
  if (rawTo) return { to: endOfDay(rawTo) };

  return { from: startOfDay(minutes(-30 * 24 * 60)), to: endOfDay(new Date()) };
};

const inRange = (field: string, range: Range) =>
  range.from || range.to
    ? { [field]: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
    : Object.create(null);

/** WHERE clause shared by the trips report + summary + CSV export. */
const tripWhere = (query: Record<string, any>, range: Range) => {
  const where: Record<string, any> = { ...inRange("createdAt", range) };

  const busId = readFilter(query, "busId");
  const driverId = readFilter(query, "driverId");
  const routeId = readFilter(query, "routeId");
  const status = readFilter(query, "status");
  const tripType = readFilter(query, "tripType");
  const search = readFilter(query, "search");

  if (busId) where.busId = busId;
  if (driverId) where.driverId = driverId;
  if (routeId) where.routeId = routeId;
  if (status) where.status = status;
  if (tripType) where.tripType = tripType;
  if (search) where.notes = { contains: search, mode: "insensitive" };

  return where;
};

const busSelect = {
  id: true,
  busNumber: true,
  name: true,
  registrationNumber: true,
  capacity: true,
  status: true,
  isActive: true,
  mileage: true,
};

const driverSelect = {
  id: true,
  fullName: true,
  username: true,
};

const routeSelect = {
  id: true,
  name: true,
  startLocation: true,
  endLocation: true,
  estimatedDuration: true,
};

// ---------------------------------------------------------------------------
// Category builders (shared by JSON + CSV)
// ---------------------------------------------------------------------------

const buildFleetRows = async () => {
  const buses = await prisma.bus.findMany({
    where: { isActive: true },
    include: {
      driver: { select: driverSelect },
      route: { select: routeSelect },
    },
    orderBy: { busNumber: "asc" },
  });

  const restrictedIds = new Set(
    (
      await prisma.maintenanceRecord.findMany({
        where: {
          blocksOperation: true,
          status: { in: ["REPORTED", "APPROVED", "SCHEDULED", "IN_PROGRESS"] },
        },
        select: { busId: true },
      })
    ).map((record) => record.busId)
  );

  const now = new Date();
  const rows = buses.map((bus) => ({
    _id: bus.id,
    busNumber: bus.busNumber,
    name: bus.name,
    registrationNumber: bus.registrationNumber,
    capacity: bus.capacity,
    status: bus.status,
    mileage: bus.mileage,
    driver: bus.driver?.fullName ?? "",
    route: bus.route?.name ?? "",
    maintenanceRestricted: restrictedIds.has(bus.id) ? "Yes" : "No",
    inspectionDue: bus.nextInspectionDueAt
      ? bus.nextInspectionDueAt <= minutes(30 * 24 * 60) && bus.nextInspectionDueAt >= startOfDay(minutes(0))
        ? "Due soon"
        : bus.nextInspectionDueAt < now
          ? "Overdue"
          : bus.nextInspectionDueAt.toISOString().slice(0, 10)
      : "",
    insuranceExpiry: bus.insuranceExpiresAt
      ? bus.insuranceExpiresAt <= minutes(60 * 24 * 60)
        ? bus.insuranceExpiresAt.toISOString().slice(0, 10)
        : ""
      : "",
    registrationExpiry: bus.registrationExpiresAt
      ? bus.registrationExpiresAt <= minutes(60 * 24 * 60)
        ? bus.registrationExpiresAt.toISOString().slice(0, 10)
        : ""
      : "",
  }));

  const totals = {
    total: buses.length,
    running: buses.filter((bus) => bus.status === "RUNNING").length,
    idle: buses.filter((bus) => bus.status === "IDLE").length,
    stopped: buses.filter((bus) => bus.status === "STOPPED").length,
    maintenanceRestricted: restrictedIds.size,
    totalCapacity: buses.reduce((sum, bus) => sum + (bus.capacity ?? 0), 0),
  };

  return {
    columns: [
      { key: "busNumber", label: "Bus number" },
      { key: "name", label: "Bus name" },
      { key: "registrationNumber", label: "Registration" },
      { key: "capacity", label: "Capacity" },
      { key: "status", label: "Status" },
      { key: "mileage", label: "Mileage (km)" },
      { key: "driver", label: "Driver" },
      { key: "route", label: "Route" },
      { key: "maintenanceRestricted", label: "Maintenance restricted" },
      { key: "inspectionDue", label: "Inspection due" },
      { key: "insuranceExpiry", label: "Insurance expiry" },
      { key: "registrationExpiry", label: "Registration expiry" },
    ],
    rows,
    totals,
  };
};

const buildTripsRows = async (query: Record<string, any>) => {
  const range = readRange(query);
  const where = tripWhere(query, range);

  const trips = await prisma.trip.findMany({
    where,
    include: {
      bus: { select: busSelect },
      driver: { select: driverSelect },
      route: { select: routeSelect },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = trips.map((trip) => ({
    _id: trip.id,
    tripType: trip.tripType,
    status: trip.status,
    bus: trip.bus.busNumber,
    driver: trip.driver.fullName,
    route: trip.route.name,
    scheduledStartAt: trip.scheduledStartAt?.toISOString() ?? "",
    actualStartAt: trip.actualStartAt?.toISOString() ?? "",
    actualEndAt: trip.actualEndAt?.toISOString() ?? "",
    delayMinutes: trip.delayMinutes,
    distanceKm: trip.distanceKm == null ? "" : round2(trip.distanceKm),
    durationMinutes:
      trip.actualStartAt && trip.actualEndAt
        ? Math.round(
            (trip.actualEndAt.getTime() - trip.actualStartAt.getTime()) / 60000
          )
        : "",
  }));

  const byStatus = trips.reduce<Record<string, number>>((acc, trip) => {
    acc[trip.status] = (acc[trip.status] ?? 0) + 1;
    return acc;
  }, {});

  const totals = {
    total: trips.length,
    scheduled: byStatus.SCHEDULED ?? 0,
    ready: byStatus.READY ?? 0,
    inProgress: byStatus.IN_PROGRESS ?? 0,
    delayed: byStatus.DELAYED ?? 0,
    completed: byStatus.COMPLETED ?? 0,
    cancelled: byStatus.CANCELLED ?? 0,
    totalDistanceKm: round2(
      trips.reduce((sum, trip) => sum + (trip.distanceKm ?? 0), 0)
    ),
    avgDurationMinutes:
      trips.length > 0
        ? Math.round(
            trips.reduce((sum, trip) => {
              if (!trip.actualStartAt || !trip.actualEndAt) return sum;
              return (
                sum +
                (trip.actualEndAt.getTime() - trip.actualStartAt.getTime()) /
                  60000
              );
            }, 0) / trips.length
          )
        : 0,
  };

  return {
    columns: [
      { key: "tripType", label: "Trip type" },
      { key: "status", label: "Status" },
      { key: "bus", label: "Bus" },
      { key: "driver", label: "Driver" },
      { key: "route", label: "Route" },
      { key: "scheduledStartAt", label: "Scheduled start" },
      { key: "actualStartAt", label: "Actual start" },
      { key: "actualEndAt", label: "Actual end" },
      { key: "delayMinutes", label: "Delay (min)" },
      { key: "distanceKm", label: "Distance (km)" },
      { key: "durationMinutes", label: "Duration (min)" },
    ],
    rows,
    totals,
  };
};

const buildRoutesRows = async (query: Record<string, any>) => {
  const range = readRange(query);
  const top = readFilter(query, "routeId");
  const routes = await prisma.route.findMany({
    include: {
      stops: { orderBy: { sequence: "asc" }, select: { id: true, name: true } },
      trips: {
        where: { ...inRange("createdAt", range), ...(top ? { routeId: top } : {}) },
        select: {
          status: true,
          distanceKm: true,
          actualStartAt: true,
          actualEndAt: true,
          delayMinutes: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = routes.map((route) => {
    const completed = route.trips.filter((trip) => trip.status === "COMPLETED");
    const delayed = route.trips.filter((trip) => trip.delayMinutes > 0);
    const totalMinutes = completed.reduce((sum, trip) => {
      if (!trip.actualStartAt || !trip.actualEndAt) return sum;
      return (
        sum +
        (trip.actualEndAt.getTime() - trip.actualStartAt.getTime()) / 60000
      );
    }, 0);

    return {
      _id: route.id,
      name: route.name,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      stops: route.stops.length,
      estimatedDuration: route.estimatedDuration,
      isActive: route.isActive ? "Yes" : "No",
      trips: route.trips.length,
      completed: completed.length,
      delayed: delayed.length,
      cancelled: route.trips.filter((trip) => trip.status === "CANCELLED").length,
      avgDurationMinutes:
        completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
      totalDistanceKm: round2(
        route.trips.reduce((sum, trip) => sum + (trip.distanceKm ?? 0), 0)
      ),
    };
  });

  return {
    columns: [
      { key: "name", label: "Route" },
      { key: "startLocation", label: "Start" },
      { key: "endLocation", label: "End" },
      { key: "stops", label: "Stops" },
      { key: "estimatedDuration", label: "Est. duration (min)" },
      { key: "isActive", label: "Active" },
      { key: "trips", label: "Trips" },
      { key: "completed", label: "Completed" },
      { key: "delayed", label: "Delayed" },
      { key: "cancelled", label: "Cancelled" },
      { key: "avgDurationMinutes", label: "Avg duration (min)" },
      { key: "totalDistanceKm", label: "Distance (km)" },
    ],
    rows,
    totals: {
      routes: rows.length,
      trips: rows.reduce((sum, row) => sum + row.trips, 0),
      completed: rows.reduce((sum, row) => sum + row.completed, 0),
      delayed: rows.reduce((sum, row) => sum + row.delayed, 0),
    },
  };
};

const buildDriversRows = async (query: Record<string, any>) => {
  const range = readRange(query);
  const where = tripWhere(query, range);

  const driverTripCounts = await prisma.trip.groupBy({
    by: ["driverId", "status"],
    where,
    _count: { _all: true },
  });
  const driverDistances = await prisma.trip.groupBy({
    by: ["driverId"],
    where: { ...where, status: "COMPLETED", distanceKm: { not: null } },
    _sum: { distanceKm: true },
  });

  const drivers = await prisma.driver.findMany({ select: driverSelect });

  const rows: any[] = [];
  for (const driver of drivers) {
    const statusMap: Record<string, number> = {};
    let assigned = 0;
    for (const group of driverTripCounts.filter((row) => row.driverId === driver.id)) {
      statusMap[group.status] = group._count._all;
      assigned += group._count._all;
    }
    const distance =
      driverDistances.find((row) => row.driverId === driver.id)?._sum.distanceKm ??
      null;

    // GPS compliance: fixes reported vs trips assigned (any completed run).
    let gpsFixes = 0;
    const bus = await prisma.bus.findFirst({
      where: { driverId: driver.id },
      select: { id: true },
    });
    if (bus) {
      gpsFixes = await prisma.busLocation.count({
        where: { busId: bus.id, ...inRange("recordedAt", range) },
      });
    }

    rows.push({
      _id: driver.id,
      driver: driver.fullName,
      username: driver.username,
      assignedTrips: assigned,
      inProgress: statusMap.IN_PROGRESS ?? 0,
      completed: statusMap.COMPLETED ?? 0,
      cancelled: statusMap.CANCELLED ?? 0,
      delayed: statusMap.DELAYED ?? 0,
      distanceKm: distance == null ? "" : round2(distance),
      gpsFixes,
    });
  }

  return {
    columns: [
      { key: "driver", label: "Driver" },
      { key: "username", label: "Username" },
      { key: "assignedTrips", label: "Assigned trips" },
      { key: "inProgress", label: "In progress" },
      { key: "completed", label: "Completed" },
      { key: "cancelled", label: "Cancelled" },
      { key: "delayed", label: "Delayed" },
      { key: "distanceKm", label: "Distance (km)" },
      { key: "gpsFixes", label: "GPS fixes" },
    ],
    rows,
    totals: {
      drivers: rows.length,
      trips: rows.reduce((sum, row) => sum + row.assignedTrips, 0),
      completed: rows.reduce((sum, row) => sum + row.completed, 0),
      cancelled: rows.reduce((sum, row) => sum + row.cancelled, 0),
    },
  };
};

const buildMaintenanceRows = async (query: Record<string, any>) => {
  const range = readRange(query);
  const where: Record<string, any> = {
    ...inRange("date", range),
    ...(readFilter(query, "busId") ? { busId: readFilter(query, "busId") } : {}),
    ...(readFilter(query, "status") ? { status: readFilter(query, "status") } : {}),
    ...(readFilter(query, "type") ? { type: readFilter(query, "type") } : {}),
  };

  const records = await prisma.maintenanceRecord.findMany({
    where,
    include: {
      bus: { select: { id: true, busNumber: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  const rows = records.map((record) => ({
    _id: record.id,
    ticketNumber: record.ticketNumber,
    bus: record.bus.busNumber,
    type: record.type,
    title: record.title,
    status: record.status,
    priority: record.priority,
    severity: record.severity,
    date: record.date.toISOString().slice(0, 10),
    mileage: record.mileage ?? "",
    serviceProvider: record.serviceProvider || record.performedBy || "",
    totalCost: record.totalCost ?? record.cost ?? 0,
    nextDueAt: record.nextDueAt?.toISOString().slice(0, 10) ?? "",
    reportedByName: record.reportedByName,
    completedByName: record.completedByName,
  }));

  const totals = {
    total: records.length,
    open: records.filter((record) => !["COMPLETED", "CANCELLED"].includes(record.status)).length,
    completed: records.filter((record) => record.status === "COMPLETED").length,
    cancelled: records.filter((record) => record.status === "CANCELLED").length,
    totalCost: round2(records.reduce((sum, record) => sum + (record.totalCost ?? record.cost ?? 0), 0)),
  };

  return {
    columns: [
      { key: "ticketNumber", label: "Ticket" },
      { key: "bus", label: "Bus" },
      { key: "type", label: "Type" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "severity", label: "Severity" },
      { key: "date", label: "Reported" },
      { key: "mileage", label: "Mileage" },
      { key: "serviceProvider", label: "Provider" },
      { key: "totalCost", label: "Total cost" },
      { key: "nextDueAt", label: "Next due" },
    ],
    rows,
    totals,
  };
};

const buildExpensesRows = async (query: Record<string, any>) => {
  const range = readRange(query);
  const busFilter =
    readFilter(query, "busId") ? readFilter(query, "busId") : undefined;

  const [maintenance, fuel] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where: {
        ...(busFilter ? { busId: busFilter } : {}),
        ...inRange("date", range),
      },
      include: { bus: { select: { id: true, busNumber: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.fuelRecord.findMany({
      where: {
        ...(busFilter ? { busId: busFilter } : {}),
        ...inRange("date", range),
      },
      include: {
        bus: { select: { id: true, busNumber: true } },
        driver: { select: { fullName: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const rows = [
    ...maintenance.map((record) => ({
      _id: record.id,
      category: "Maintenance",
      bus: record.bus.busNumber,
      date: record.date.toISOString().slice(0, 10),
      reference: record.ticketNumber,
      description: record.title || record.description,
      amount: round2(record.totalCost ?? record.cost ?? 0),
    })),
    ...fuel.map((record) => ({
      _id: record.id,
      category: "Fuel",
      bus: record.bus.busNumber,
      date: record.date.toISOString().slice(0, 10),
      reference: record.station,
      description: `${record.liters} L @ ${record.pricePerLiter ?? 0}`,
      amount: round2(record.totalCost ?? 0),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    columns: [
      { key: "category", label: "Category" },
      { key: "bus", label: "Bus" },
      { key: "date", label: "Date" },
      { key: "reference", label: "Reference" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount" },
    ],
    rows,
    totals: {
      entries: rows.length,
      maintenance: round2(
        rows.filter((row) => row.category === "Maintenance").reduce((sum, row) => sum + row.amount, 0)
      ),
      fuel: round2(
        rows.filter((row) => row.category === "Fuel").reduce((sum, row) => sum + row.amount, 0)
      ),
      total: round2(rows.reduce((sum, row) => sum + row.amount, 0)),
    },
  };
};

const buildStudentsRows = async (query: Record<string, any>) => {
  const range = readRange(query);
  const assignments = await prisma.busStudentAssignment.findMany({
    where: {
      isActive: true,
      ...(readFilter(query, "busId") ? { busId: readFilter(query, "busId") } : {}),
      ...(readFilter(query, "routeId") ? { routeId: readFilter(query, "routeId") } : {}),
      ...inRange("assignedAt", range),
    },
    include: {
      student: { select: { id: true, fullName: true, username: true } },
      bus: { select: { id: true, busNumber: true } },
      pickupStop: { select: { id: true, name: true } },
      dropoffStop: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  const routeIds = [
    ...new Set(assignments.map((assignment) => assignment.routeId).filter(Boolean)),
  ] as string[];
  const routeNames = new Map(
    (
      await prisma.route.findMany({
        where: { id: { in: routeIds } },
        select: { id: true, name: true },
      })
    ).map((route) => [route.id, route.name])
  );

  return {
    columns: [
      { key: "student", label: "Student" },
      { key: "username", label: "Username" },
      { key: "bus", label: "Bus" },
      { key: "route", label: "Route" },
      { key: "pickupStop", label: "Pickup stop" },
      { key: "dropoffStop", label: "Drop-off stop" },
      { key: "assignedAt", label: "Assigned" },
    ],
    rows: assignments.map((assignment) => ({
      _id: assignment.id,
      student: assignment.student?.fullName ?? "",
      username: assignment.student?.username ?? "",
      bus: assignment.bus.busNumber,
      route: assignment.routeId
        ? (routeNames.get(assignment.routeId) ?? "")
        : "",
      pickupStop: assignment.pickupStop?.name ?? "",
      dropoffStop: assignment.dropoffStop?.name ?? "",
      assignedAt: assignment.assignedAt.toISOString().slice(0, 10),
    })),
    totals: {
      students: assignments.length,
      buses: new Set(assignments.map((assignment) => assignment.busId)).size,
    },
  };
};

const BUILDERS: Record<string, (query: Record<string, any>) => Promise<any>> = {
  fleet: buildFleetRows,
  trips: buildTripsRows,
  routes: buildRoutesRows,
  drivers: buildDriversRows,
  maintenance: buildMaintenanceRows,
  expenses: buildExpensesRows,
  students: buildStudentsRows,
};

// ---------------------------------------------------------------------------
// CSV rendering
// ---------------------------------------------------------------------------

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const toCsv = (
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): string => {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvEscape(row[column.key])).join(",")
  );
  return [header, ...body].join("\n");
};

const appendTotals = (
  csv: string,
  totals: Record<string, unknown>
): string =>
  `${csv}\n\n${Object.entries(totals)
    .map(([key, value]) => `${csvEscape(key)},${csvEscape(value)}`)
    .join("\n")}`;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const reportsRouter = Router();

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const range = readRange(req.query as Record<string, any>);
    const query = req.query as Record<string, any>;
    const where = tripWhere(query, range);

    const [
      fleetSize,
      statusGroups,
      restricted,
      tripGroups,
      completedRows,
      maintenanceRange,
      fuelRange,
      upcomingInspections,
      expiringDocuments,
      driverIds,
    ] = await Promise.all([
      prisma.bus.count({ where: { isActive: true } }),
      prisma.bus.groupBy({ by: ["status"], where: { isActive: true }, _count: { _all: true } }),
      countMaintenanceRestrictedBuses(),
      prisma.trip.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.trip.findMany({
        where: {
          ...where,
          status: "COMPLETED",
          actualStartAt: { not: null },
          actualEndAt: { not: null },
        },
        select: { actualStartAt: true, actualEndAt: true, distanceKm: true, delayMinutes: true },
      }),
      prisma.maintenanceRecord.aggregate({
        _sum: { totalCost: true, cost: true },
        where: { ...inRange("date", range) },
      }),
      prisma.fuelRecord.aggregate({
        _sum: { totalCost: true },
        where: { ...inRange("date", range) },
      }),
      prisma.bus.findMany({
        where: {
          isActive: true,
          OR: [
            { nextInspectionDueAt: { lte: minutes(30 * 24 * 60), not: null } },
            {
              maintenanceRecords: {
                some: { status: "COMPLETED", nextDueAt: { lte: minutes(30 * 24 * 60), not: null } },
              },
            },
          ],
        },
        select: {
          busNumber: true,
          nextInspectionDueAt: true,
          maintenanceRecords: {
            where: { status: "COMPLETED", nextDueAt: { not: null } },
            select: { nextDueAt: true },
            orderBy: { nextDueAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.bus.findMany({
        where: {
          isActive: true,
          OR: [
            { insuranceExpiresAt: { lte: minutes(60 * 24 * 60), not: null } },
            { registrationExpiresAt: { lte: minutes(60 * 24 * 60), not: null } },
          ],
        },
        select: {
          busNumber: true,
          insuranceExpiresAt: true,
          registrationExpiresAt: true,
          insuranceProvider: true,
        },
      }),
      prisma.trip.groupBy({ by: ["driverId"], where, _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(
      (tripGroups as { status: string; _count: { _all: number } }[]).map((group) => [
        group.status,
        group._count._all,
      ])
    );

    const averageDuration =
      completedRows.length > 0
        ? Math.round(
            completedRows.reduce((sum, trip) => {
              return (
                sum +
                (trip.actualEndAt!.getTime() - trip.actualStartAt!.getTime()) /
                  60000
              );
            }, 0) / completedRows.length
          )
        : 0;

    const totalDistance = round2(
      completedRows.reduce((sum, trip) => sum + (trip.distanceKm ?? 0), 0)
    );

    const scheduledTotal =
      (byStatus.SCHEDULED ?? 0) +
      (byStatus.READY ?? 0) +
      (byStatus.IN_PROGRESS ?? 0) +
      (byStatus.DELAYED ?? 0) +
      (byStatus.COMPLETED ?? 0);

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        range: {
          from: range.from?.toISOString() ?? null,
          to: range.to?.toISOString() ?? null,
        },
        fleet: {
          fleetSize,
          running: (statusGroups.find((g) => g.status === "RUNNING")?._count._all) ?? 0,
          idle: (statusGroups.find((g) => g.status === "IDLE")?._count._all) ?? 0,
          stopped: (statusGroups.find((g) => g.status === "STOPPED")?._count._all) ?? 0,
          maintenanceRestricted: restricted,
        },
        trips: {
          scheduled: byStatus.SCHEDULED ?? 0,
          ready: byStatus.READY ?? 0,
          inProgress: byStatus.IN_PROGRESS ?? 0,
          delayed: byStatus.DELAYED ?? 0,
          completed: byStatus.COMPLETED ?? 0,
          cancelled: byStatus.CANCELLED ?? 0,
          total: scheduledTotal,
          completionRate:
            scheduledTotal > 0
              ? round2(((byStatus.COMPLETED ?? 0) / scheduledTotal) * 100)
              : 0,
          fleetUtilization:
            fleetSize > 0 ? round2(scheduledTotal / fleetSize) : 0,
        },
        performance: {
          totalDistanceKm: totalDistance,
          averageDurationMinutes: averageDuration,
          delays: byStatus.DELAYED ?? 0,
          driversActive: driverIds.length,
        },
        expenses: {
          maintenance: round2(
            (maintenanceRange._sum.totalCost ?? 0) +
              (maintenanceRange._sum.cost ?? 0)
          ),
          fuel: round2(fuelRange._sum.totalCost ?? 0),
        },
        upcoming: {
          inspectionsAndService: upcomingInspections.map((bus) => ({
            busNumber: bus.busNumber,
            dueAt:
              bus.nextInspectionDueAt?.toISOString() ??
              bus.maintenanceRecords[0]?.nextDueAt?.toISOString() ??
              null,
          })),
          expiringDocuments: expiringDocuments.map((bus) => ({
            busNumber: bus.busNumber,
            insuranceExpiresAt: bus.insuranceExpiresAt?.toISOString() ?? null,
            registrationExpiresAt: bus.registrationExpiresAt?.toISOString() ?? null,
          })),
        },
      },
    });
  })
);

reportsRouter.get(
  "/:category/csv",
  asyncHandler(async (req, res) => {
    const category = req.params.category;
    const builder = BUILDERS[category];
    if (!builder) throw badRequest(`Unknown report category "${category}"`);

    const { rows, columns, totals } = await builder(req.query as Record<string, any>);
    const range = readRange(req.query as Record<string, any>);

    const meta = [
      `Report,${category} report`,
      `Generated at,${new Date().toISOString()}`,
      `Date range,${range.from?.toISOString().slice(0, 10) ?? ""} - ${
        range.to?.toISOString().slice(0, 10) ?? ""
      }`,
      `Filters,${Object.entries(req.query)
        .filter(([key]) => !["from", "to"].includes(key))
        .map(([key, value]) => `${key}=${value}`)
        .join("; ")}`,
    ].join("\n");

    const csv = appendTotals(toCsv(rows, columns), totals);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="connected-${category}-report.csv"`
    );
    res.send(`${meta}\n\n${csv}`);
  })
);

reportsRouter.get(
  "/:category",
  asyncHandler(async (req, res) => {
    const builder = BUILDERS[req.params.category];
    if (!builder) throw badRequest(`Unknown report category "${req.params.category}"`);
    const result = await builder(req.query as Record<string, any>);
    res.json({ success: true, data: mapDoc(result.rows), totals: result.totals });
  })
);