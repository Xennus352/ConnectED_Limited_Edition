import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { prisma } from "../../config/prisma";
import { crudRouter } from "../shared/crud";
import {
  getBusTrack,
  getDriverBus,
  getFleetSnapshot,
  getStudentTransport,
  resolveDriverBusId,
} from "./fleet";
import {
  startTrip,
  stopTrip,
  updateDriverLocation,
} from "./transportation.controller";
import { driverTripRouter, tripsAdminRouter, tripsRouter } from "./trips";
import { maintenanceRouter } from "./maintenance";
import { reportsRouter } from "./reports";
import {
  busAdminRouter,
  fuelRouter,
  incidentsRouter,
  listDriverIncidents,
  reportDriverIncident,
} from "./management";

export {
  busAdminRouter,
  fuelRouter,
  incidentsRouter,
  maintenanceRouter,
  reportsRouter,
  tripsAdminRouter,
  tripsRouter,
};

const searchable = ["busNumber", "registrationNumber", "name", "status"];

// Buses
export const busesRouter = crudRouter({
  delegate: "bus",
  include: {
    route: {
      select: {
        id: true,
        name: true,
        description: true,
        startLocation: true,
        endLocation: true,
        isActive: true,
      },
    },
    driver: {
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        username: true,
        profilePhoto: true,
      },
    },
  },
  searchable,
  statusField: true,
  dateField: "createdAt",
  extraFilters: {
    isActive: "isActive",
    route: "routeId",
    driver: "driverId",
  },
  relationInputs: { route: "routeId", driver: "driverId" },
  beforeWrite: async (data: any) => data,
});

// Routes
export const routesRouter = crudRouter({
  delegate: "route",
  include: {
    stops: { orderBy: { sequence: "asc" as const } },
    buses: { select: { id: true, busNumber: true, status: true } },
  },
  searchable: ["name", "startLocation", "endLocation"],
  statusField: false,
});

// RouteStops
export const routeStopsRouter = crudRouter({
  delegate: "routeStop",
  searchable: ["name"],
  relationInputs: { route: "routeId" },
  beforeWrite: (data, mode) => {
    // The stops editor does not geocode; schema requires Float lat/lng.
    if (mode === "create" && data.latitude == null) data.latitude = 0;
    if (mode === "create" && data.longitude == null) data.longitude = 0;
    return data;
  },
});

// BusStudentAssignments
export const busAssignmentsRouter = crudRouter({
  delegate: "busStudentAssignment",
  include: {
    pickupStop: true,
    dropoffStop: true,
    student: { select: { id: true, fullName: true, profilePhoto: true } },
  },
  relationInputs: {
    bus: "busId",
    pickupStop: "pickupStopId",
    dropoffStop: "dropoffStopId",
    student: "studentId",
  },
  searchable: ["id"],
});

// Location history (read-only for the UI — the live map never queries it)
export const busLocationRouter = crudRouter({
  delegate: "busLocation",
  relationInputs: { bus: "busId" },
  dateField: "recordedAt",
});

/** Rejects anything that is not a signed-in driver. */
const requireDriver: RequestHandler = (req, res, next) => {
  if (req.user?.role?.toLowerCase() !== "driver") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  next();
};

/**
 * Transportation endpoints that are not plain CRUD:
 *
 *   GET  /admin/fleet         fleet snapshot (admin scope)
 *   GET  /fleet               fleet snapshot (scope follows the role)
 *   GET  /parent/fleet        fleet snapshot, parent scope
 *   GET  /driver/bus          the signed-in driver's own vehicle
 *   GET  /buses/:id/track     route geometry + stops for one vehicle
 *   POST /buses/:id/location  driver GPS ingestion  -> emits `bus:location`
 *   POST /buses/:id/start-trip                       -> emits `bus:status`
 *   POST /buses/:id/stop-trip                        -> emits `bus:status`
 */
export const transportCustomRouter = Router();

// Express 4 does not catch rejected promises — every async handler below
// goes through asyncHandler so an authorization error becomes a proper
// 403/404 response instead of a hung request.
transportCustomRouter.get("/admin/fleet", asyncHandler(getFleetSnapshot));
transportCustomRouter.get("/fleet", asyncHandler(getFleetSnapshot));
transportCustomRouter.get("/parent/fleet", asyncHandler(getFleetSnapshot));
transportCustomRouter.get("/driver/bus", asyncHandler(getDriverBus));
transportCustomRouter.get("/student/transport", asyncHandler(getStudentTransport));
transportCustomRouter.get("/buses/:id/track", asyncHandler(getBusTrack));

transportCustomRouter.post(
  "/buses/:id/location",
  requireDriver,
  asyncHandler(updateDriverLocation)
);
transportCustomRouter.post(
  "/buses/:id/start-trip",
  requireDriver,
  asyncHandler(startTrip)
);
transportCustomRouter.post(
  "/buses/:id/stop-trip",
  requireDriver,
  asyncHandler(stopTrip)
);

// Driver trip console: list own trips, start / complete / delay them.
// The router carries its own driver guard.
transportCustomRouter.use("/driver/trips", driverTripRouter);

// Driver incident reporting against their own bus.
transportCustomRouter.post(
  "/driver/incidents",
  requireDriver,
  asyncHandler(reportDriverIncident)
);

// Driver's own incident history (used by the driver alerts centre).

// Driver bus assignments — scoped to the authenticated driver's assigned bus.
const driverAssignmentRouter = Router();
driverAssignmentRouter.use(requireDriver);

driverAssignmentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const driverBusId = await resolveDriverBusId(req.user!.id);
    if (!driverBusId) {
      return res.json({ success: true, data: [], meta: { total: 0, skip: 0, limit: 0, page: 1 } });
    }
    const assignments = await prisma.busStudentAssignment.findMany({
      where: { busId: driverBusId, isActive: true },
      include: {
        student: { select: { id: true, fullName: true, profilePhoto: true } },
        pickupStop: true,
        dropoffStop: true,
      },
      orderBy: { assignedAt: "desc" },
    });
    res.json({
      success: true,
      data: assignments.map((a) => ({
        ...a,
        student: a.student ? { id: a.student.id, fullName: a.student.fullName, profilePhoto: a.student.profilePhoto } : null,
        pickupStopName: a.pickupStop?.name,
        dropoffStopName: a.dropoffStop?.name,
      })),
      meta: {
        total: assignments.length,
        skip: 0,
        limit: assignments.length,
        page: 1,
      },
    });
  })
);

driverAssignmentRouter.post(
  "/create",
  asyncHandler(async (req, res) => {
    const driverBusId = await resolveDriverBusId(req.user!.id);
    if (!driverBusId) {
      return res.json({ success: false, message: "Driver not assigned to a bus" });
    }
    const { studentId, pickupStopId, dropoffStopId } = req.body;
    if (!studentId) {
      return res.json({ success: false, message: "Student is required" });
    }
    const assignment = await prisma.busStudentAssignment.create({
      data: {
        busId: driverBusId,
        studentId: req.body.studentId,
        pickupStopId,
        dropoffStopId,
        isActive: true,
      },
      include: {
        student: { select: { id: true, fullName: true, profilePhoto: true } },
        pickupStop: true,
        dropoffStop: true,
      },
    });
    res.json({ success: true, data: assignment });
  })
);

driverAssignmentRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const driverBusId = await resolveDriverBusId(req.user!.id);
    if (!driverBusId) {
      return res.json({ success: false, message: "Driver not assigned to a bus" });
    }
    const { id } = req.params;
    const assignment = await prisma.busStudentAssignment.findUnique({ where: { id } });
    if (!assignment || assignment.busId !== driverBusId) {
      return res.json({ success: false, message: "Assignment not found or not yours" });
    }
    const updated = await prisma.busStudentAssignment.update({
      where: { id },
      data: {
        studentId: req.body.studentId ?? undefined,
        pickupStopId: req.body.pickupStopId ?? undefined,
        dropoffStopId: req.body.dropoffStopId ?? undefined,
      },
      include: {
        student: { select: { id: true, fullName: true, profilePhoto: true } },
        pickupStop: true,
        dropoffStop: true,
      },
    });
    res.json({ success: true, data: updated });
  })
);

driverAssignmentRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const driverBusId = await resolveDriverBusId(req.user!.id);
    if (!driverBusId) {
      return res.json({ success: false, message: "Driver not assigned to a bus" });
    }
    const { id } = req.params;
    const assignment = await prisma.busStudentAssignment.findUnique({ where: { id } });
    if (!assignment || assignment.busId !== driverBusId) {
      return res.json({ success: false, message: "Assignment not found or not yours" });
    }
    await prisma.busStudentAssignment.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  })
);

transportCustomRouter.use("/driver/assignments", driverAssignmentRouter);

transportCustomRouter.get(
  "/driver/incidents",
  requireDriver,
  asyncHandler(listDriverIncidents)
);
