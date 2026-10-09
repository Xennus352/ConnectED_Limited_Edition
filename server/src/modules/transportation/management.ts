import { Router, type RequestHandler } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, notFound } from "../../lib/errors";
import { mapDoc } from "../../lib/serialize";
import { emitFleetListUpdate } from "../../sockets";
import { crudRouter } from "../shared/crud";
import { resolveDriverBusId } from "./fleet";

/**
 * Non-CRUD administration helpers for the fleet: safe bus deletion (archive
 * when history must be preserved), fuel and incident management, and the
 * driver's own incident reporter.
 */

// ---------------------------------------------------------------------------
// Buses — archive-or-delete + restore
// ---------------------------------------------------------------------------

export const busAdminRouter = Router();

/**
 * Deleting a bus that owns trips / maintenance / incidents / fuel would
 * destroy audit history (most of these cascade). Instead the bus is
 * archived (isActive=false, OFFLINE) and can be restored. Only a bus with no
 * history is actually removed.
 */
busAdminRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.id },
      include: {
        driver: { select: { id: true, fullName: true } },
        route: { select: { id: true, name: true } },
      },
    });
    if (!bus) throw notFound("Bus not found");

    const [trips, incidents, fuel, maintenance] = await Promise.all([
      prisma.trip.count({ where: { busId: bus.id } }),
      prisma.incident.count({ where: { busId: bus.id } }),
      prisma.fuelRecord.count({ where: { busId: bus.id } }),
      prisma.maintenanceRecord.count({ where: { busId: bus.id } }),
    ]);

    if (trips || incidents || fuel || maintenance) {
      const archived = await prisma.bus.update({
        where: { id: bus.id },
        data: { isActive: false, status: "OFFLINE" },
      });
      emitFleetListUpdate("buses", "updated", bus.id);
      res.json({
        success: true,
        data: mapDoc({ ...archived, archived: true }),
        message: "Bus archived — history preserved",
      });
      return;
    }

    await prisma.bus.delete({ where: { id: bus.id } });
    emitFleetListUpdate("buses", "deleted", bus.id);
    res.json({
      success: true,
      data: { _id: bus.id, deleted: true },
      message: "Bus deleted",
    });
  })
);

busAdminRouter.post(
  "/:id/restore",
  asyncHandler(async (req, res) => {
    const bus = await prisma.bus.findUnique({ where: { id: req.params.id } });
    if (!bus) throw notFound("Bus not found");
    if (bus.isActive) {
      res.json({ success: true, data: mapDoc(bus), message: "Bus is already active" });
      return;
    }
    const restored = await prisma.bus.update({
      where: { id: bus.id },
      data: { isActive: true },
    });
    emitFleetListUpdate("buses", "updated", bus.id);
    res.json({ success: true, data: mapDoc(restored), message: "Bus restored to service" });
  })
);

// ---------------------------------------------------------------------------
// Fuel records
// ---------------------------------------------------------------------------

export const fuelRouter = crudRouter({
  delegate: "fuelRecord",
  include: {
    bus: { select: { id: true, busNumber: true, name: true } },
    driver: { select: { id: true, fullName: true, username: true } },
  },
  searchable: ["station", "notes"],
  relationFilters: { bus: "busId", driver: "driverId" },
  dateField: "date",
  dates: ["date"],
  relationInputs: { bus: "busId", driver: "driverId" },
  beforeWrite: async (data) => {
    if (typeof data.liters === "number") {
      const price = Number(data.pricePerLiter);
      data.totalCost = Math.round(data.liters * (Number.isFinite(price) ? price : 0) * 100) / 100;
    }
    return data;
  },
});

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

const INCIDENT_TYPES = [
  "ACCIDENT",
  "MEDICAL",
  "BREAKDOWN",
  "ROUTE_DEVIATION",
  "SECURITY",
  "GPS_FAILURE",
  "OTHER",
];
const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const incidentsRouter = crudRouter({
  delegate: "incident",
  include: {
    bus: { select: { id: true, busNumber: true, name: true } },
    driver: { select: { id: true, fullName: true, username: true } },
    trip: { select: { id: true, tripType: true, status: true } },
    route: { select: { id: true, name: true } },
  },
  searchable: ["description"],
  relationFilters: { bus: "busId", driver: "driverId", trip: "tripId", route: "routeId" },
  statusField: true,
  dateField: "occurredAt",
  extraFilters: { type: "type", severity: "severity" },
  relationInputs: { bus: "busId", driver: "driverId", trip: "tripId", route: "routeId" },
  beforeWrite: async (data, mode) => {
    if (mode === "update") {
      if (data.status === "RESOLVED") data.resolvedAt = new Date();
      if (data.status && data.status !== "RESOLVED") data.resolvedAt = null;
    }
    return data;
  },
});

/**
 * Driver incident reporter — a driver can only report an incident against
 * their own bus (and optionally their own in-flight trip).
 */
export const reportDriverIncident: RequestHandler = asyncHandler(
  async (req, res) => {
    if (req.user?.role?.toLowerCase() !== "driver") {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const driverId = req.user!.id;
    const busId = await resolveDriverBusId(driverId);
    if (!busId) throw badRequest("You are not assigned to a bus");

    const body = req.body ?? {};
    const type = String(body.type ?? "OTHER").toUpperCase();
    const severity = String(body.severity ?? "MEDIUM").toUpperCase();

    if (!INCIDENT_TYPES.includes(type)) {
      throw badRequest(`Invalid incident type "${type}"`);
    }
    if (!INCIDENT_SEVERITIES.includes(severity)) {
      throw badRequest(`Invalid incident severity "${severity}"`);
    }

    let tripId: string | undefined;
    if (body.tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: body.tripId },
        select: { id: true, driverId: true, status: true },
      });
      if (!trip) throw notFound("Trip not found");
      if (trip.driverId !== driverId) {
        throw badRequest("That trip is not assigned to you");
      }
      tripId = trip.id;
    }

    const lat = Number(body.latitude);
    const lng = Number(body.longitude);

    const incident = await prisma.incident.create({
      data: {
        busId,
        driverId,
        tripId,
        type: type as any,
        severity: severity as any,
        description: String(body.description ?? "").slice(0, 2000),
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        occurredAt: body.occurredAt ? new Date(String(body.occurredAt)) : new Date(),
        status: "OPEN",
      },
    });

    emitFleetListUpdate("incidents", "created", incident.id);
    res.json({ success: true, data: mapDoc(incident), message: "Incident reported" });
  }
);

/**
 * GET /api/driver/incidents
 * A driver sees only the incidents they reported against their own bus —
 * admins manage the full incident register through `/incidents`.
 */
export const listDriverIncidents: RequestHandler = asyncHandler(
  async (req, res) => {
    if (req.user?.role?.toLowerCase() !== "driver") {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const driverId = req.user!.id;
    const incidents = await prisma.incident.findMany({
      where: { driverId },
      include: {
        bus: { select: { id: true, busNumber: true, name: true } },
        trip: { select: { id: true, tripType: true, status: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    });

    res.json({
      success: true,
      data: mapDoc(incidents),
      meta: { total: incidents.length, skip: 0, limit: incidents.length, page: 1 },
    });
  }
);