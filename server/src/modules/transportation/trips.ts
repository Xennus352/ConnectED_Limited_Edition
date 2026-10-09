import { Router, type Request, type RequestHandler } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { readFilter } from "../../lib/query";
import { mapDoc } from "../../lib/serialize";
import { emitBusStatus, emitTripUpdate } from "../../sockets";
import { crudRouter } from "../shared/crud";
import { resolveDriverBusId } from "./fleet";
import { hasBlockingMaintenance } from "./availability";

/**
 * Trip lifecycle — enforced on the server, rejected state changes never
 * reach the database.
 *
 *   SCHEDULED ─▶ READY ─▶ IN_PROGRESS ─▶ COMPLETED
 *       │         │            │
 *       └─── DELAYED ◀─────────┘
 *   any non-final status can be CANCELLED.
 */
const TRIP_TRANSITIONS: Record<string, readonly string[]> = {
  SCHEDULED: ["READY", "IN_PROGRESS", "DELAYED", "CANCELLED"],
  READY: ["IN_PROGRESS", "DELAYED", "CANCELLED"],
  DELAYED: ["IN_PROGRESS", "SCHEDULED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  BOARDING: [],
  ARRIVED: [],
  EMERGENCY: [],
};

const assertTransition = (from: string, to: string): void => {
  const allowed = TRIP_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw badRequest(`Cannot change a trip from "${from}" to "${to}"`);
  }
};

const tripInclude = {
  bus: {
    select: {
      id: true,
      busNumber: true,
      name: true,
      registrationNumber: true,
      status: true,
    },
  },
  driver: {
    select: { id: true, fullName: true, username: true, profilePhoto: true },
  },
  route: {
    select: {
      id: true,
      name: true,
      startLocation: true,
      endLocation: true,
      estimatedDuration: true,
    },
  },
};

const negative = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const floatOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Stops the bus in the fleet view (used when an in-progress trip ends). */
const stopBus = async (busId: string) => {
  const bus = await prisma.bus.update({
    where: { id: busId },
    data: { status: "STOPPED", currentSpeed: 0 },
  });
  emitBusStatus({ busId: bus.id, status: bus.status });
  return bus;
};

const getTrip = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: tripInclude,
  });
  if (!trip) throw notFound("Trip not found");
  return trip;
};

// ---------------------------------------------------------------------------
// Driver operations
// ---------------------------------------------------------------------------

/** Guards every driver trip action: ownership + valid transition. */
const assertDriverCanOperate = async (tripId: string, driverId: string) => {
  const trip = await getTrip(tripId);
  if (trip.driverId !== driverId) {
    throw forbidden("This trip is assigned to another driver");
  }
  return trip;
};

/**
 * Starts an assigned trip. The server re-checks, atomically enough for this
 * product, that the driver still owns the bus, that the bus is not under
 * blocking maintenance, and that neither the bus nor the driver already have
 * a trip in progress.
 */
export const startTripForDriver = async (
  tripId: string,
  driverId: string,
  body: Record<string, unknown> = {}
): Promise<Record<string, any>> => {
  const trip = await assertDriverCanOperate(tripId, driverId);
  assertTransition(trip.status, "IN_PROGRESS");

  const driverBusId = await resolveDriverBusId(driverId);
  if (driverBusId !== trip.busId) {
    throw conflict("You are not currently assigned to this trip's bus");
  }

  const [blockedByMaintenance, tripsOnBus, tripsByDriver] = await Promise.all([
    hasBlockingMaintenance(trip.busId),
    prisma.trip.count({
      where: { busId: trip.busId, status: "IN_PROGRESS", id: { not: tripId } },
    }),
    prisma.trip.count({
      where: { driverId, status: "IN_PROGRESS", id: { not: tripId } },
    }),
  ]);

  if (blockedByMaintenance) {
    throw conflict(
      "This bus is under blocking maintenance and cannot start a trip"
    );
  }
  if (tripsOnBus > 0) {
    throw conflict("Another trip is already in progress on this bus");
  }
  if (tripsByDriver > 0) {
    throw conflict("You already have a trip in progress");
  }

  const now = new Date();
  const odometerStart = floatOrNull(body.odometerStart);
  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: "IN_PROGRESS",
      actualStartAt: trip.actualStartAt ?? now,
      startedBy: driverId,
      delayMinutes: 0,
      ...(odometerStart != null ? { odometerStart } : {}),
    },
    include: tripInclude,
  });

  const bus = await prisma.bus.update({
    where: { id: trip.busId },
    data: { status: "RUNNING", lastLocationAt: now },
  });

  emitBusStatus({
    busId: bus.id,
    status: bus.status,
    lastLocationAt: bus.lastLocationAt?.toISOString() ?? null,
  });
  emitTripUpdate(updated.id, updated.busId, updated.status);

  return { trip: mapDoc(updated), bus: mapDoc(bus) };
};

/** Ends an in-progress trip and brings the bus back to the yard. */
export const completeTripForDriver = async (
  tripId: string,
  driverId: string,
  body: Record<string, unknown>
): Promise<Record<string, any>> => {
  const trip = await assertDriverCanOperate(tripId, driverId);
  if (trip.status !== "IN_PROGRESS") {
    throw badRequest("Only an in-progress trip can be completed");
  }

  const odometerEnd = negative(body.odometerEnd);
  const enteredDistance = floatOrNull(body.distanceKm);
  const distanceKm =
    enteredDistance ??
    (trip.odometerStart != null && odometerEnd != null
      ? Math.abs(odometerEnd - trip.odometerStart)
      : null);
  const now = new Date();

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: "COMPLETED",
      actualEndAt: now,
      completedBy: driverId,
      ...(odometerEnd != null ? { odometerEnd } : {}),
      ...(distanceKm != null ? { distanceKm } : {}),
    },
    include: tripInclude,
  });

  const busDoc = await prisma.bus.findUnique({
    where: { id: trip.busId },
    select: { mileage: true },
  });
  const bus = await prisma.bus.update({
    where: { id: trip.busId },
    data: {
      status: "STOPPED",
      currentSpeed: 0,
      ...(odometerEnd != null && odometerEnd > (busDoc?.mileage ?? 0)
        ? { mileage: odometerEnd }
        : {}),
    },
  });

  emitBusStatus({ busId: bus.id, status: bus.status });
  emitTripUpdate(updated.id, updated.busId, updated.status, {
    distanceKm:
      updated.distanceKm != null ? updated.distanceKm : distanceKm,
  });

  return mapDoc(updated);
};

/** Marks a trip as delayed (SCHEDULED / READY only — before departure). */
export const delayTripForDriver = async (
  tripId: string,
  driverId: string,
  body: Record<string, unknown>
): Promise<Record<string, any>> => {
  const trip = await assertDriverCanOperate(tripId, driverId);
  assertTransition(trip.status, "DELAYED");

  const delayMinutes = Math.max(
    0,
    negative(body.delayMinutes) ?? 5
  );
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const notes = reason
    ? [trip.notes, reason].filter(Boolean).join(" | ")
    : trip.notes;

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "DELAYED", delayMinutes, notes },
    include: tripInclude,
  });

  emitTripUpdate(updated.id, updated.busId, updated.status, { delayMinutes });
  return mapDoc(updated);
};

/**
 * Cancels a trip. The owning driver and admins may cancel; a running trip is
 * cancelled the bus back to STOPPED.
 */
export const cancelTripForRole = async (
  tripId: string,
  actorId: string,
  role: string,
  reason?: string
): Promise<Record<string, any>> => {
  const trip = await getTrip(tripId);
  const isAdmin = role === "admin" || role === "super-admin";
  if (!isAdmin && trip.driverId !== actorId) {
    throw forbidden("This trip is assigned to another driver");
  }
  if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
    throw badRequest("This trip cannot be cancelled");
  }

  const notes = typeof reason === "string" && reason.trim()
    ? [trip.notes, `Cancelled: ${reason.trim()}`].filter(Boolean).join(" | ")
    : trip.notes;

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED", notes },
    include: tripInclude,
  });

  if (trip.status === "IN_PROGRESS") {
    await stopBus(trip.busId);
  }
  emitTripUpdate(updated.id, updated.busId, updated.status);
  return mapDoc(updated);
};

// ---------------------------------------------------------------------------
// Driver router — mounted at /driver/trips
// ---------------------------------------------------------------------------

const driverGuard: RequestHandler = (req, res, next) => {
  if (req.user?.role?.toLowerCase() !== "driver") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  next();
};

export const driverTripRouter = Router();

driverTripRouter.use(driverGuard);

driverTripRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = readFilter(req.query as Record<string, any>, "status");
    const trips = await prisma.trip.findMany({
      where: {
        driverId: req.user!.id,
        ...(status ? { status: status as any } : {}),
      },
      include: tripInclude,
      orderBy: { scheduledStartAt: "desc" },
    });
    res.json({
      success: true,
      data: mapDoc(trips),
      meta: { total: trips.length, skip: 0, limit: trips.length, page: 1 },
    });
  })
);

driverTripRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const trip = await assertDriverCanOperate(req.params.id, req.user!.id);
    res.json({ success: true, data: mapDoc(trip) });
  })
);

driverTripRouter.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const result = await startTripForDriver(
      req.params.id,
      req.user!.id,
      req.body ?? {}
    );
    res.json({ success: true, data: result, message: "Trip started" });
  })
);

driverTripRouter.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const result = await completeTripForDriver(
      req.params.id,
      req.user!.id,
      req.body ?? {}
    );
    res.json({ success: true, data: result, message: "Trip completed" });
  })
);

driverTripRouter.post(
  "/:id/delay",
  asyncHandler(async (req, res) => {
    const result = await delayTripForDriver(
      req.params.id,
      req.user!.id,
      req.body ?? {}
    );
    res.json({ success: true, data: result, message: "Trip delayed" });
  })
);

// ---------------------------------------------------------------------------
// Admin surface — CRUD + lifecycle
// ---------------------------------------------------------------------------

/** Standard list / create / read / update for admins. */
export const tripsRouter = crudRouter({
  delegate: "trip",
  include: tripInclude,
  searchable: ["notes"],
  relationFilters: { bus: "busId", driver: "driverId", route: "routeId" },
  statusField: true,
  dateField: "scheduledStartAt",
  extraFilters: { tripType: "tripType" },
  dates: ["scheduledStartAt", "scheduledEndAt"],
  relationInputs: { bus: "busId", driver: "driverId", route: "routeId" },
  beforeWrite: async (data, mode) => {
    // Trip status is owned exclusively by the lifecycle endpoints.
    delete data.status;
    if (mode === "create") data.status = "SCHEDULED";
    return data;
  },
});

/** Admin lifecycle actions + safe-delete, mounted BEFORE the crud router. */
export const tripsAdminRouter = Router();

tripsAdminRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const trip = await getTrip(req.params.id);
    if (!["SCHEDULED", "READY", "DELAYED"].includes(trip.status)) {
      throw badRequest(
        "Only scheduled trips can be deleted — cancel reported trips instead"
      );
    }
    await prisma.trip.delete({ where: { id: trip.id } });
    emitTripUpdate(trip.id, trip.busId, "CANCELLED");
    res.json({
      success: true,
      data: { _id: trip.id, deleted: true },
      message: "Trip deleted",
    });
  })
);

tripsAdminRouter.post(
  "/:id/ready",
  asyncHandler(async (req, res) => {
    const trip = await getTrip(req.params.id);
    assertTransition(trip.status, "READY");
    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: { status: "READY" },
      include: tripInclude,
    });
    emitTripUpdate(updated.id, updated.busId, updated.status);
    res.json({ success: true, data: mapDoc(updated), message: "Trip marked ready" });
  })
);

tripsAdminRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const trip = await cancelTripForRole(req.params.id, user.id, user.role, reason);
    res.json({ success: true, data: trip, message: "Trip cancelled" });
  })
);