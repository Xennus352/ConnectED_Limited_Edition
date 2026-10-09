import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { crudRouter } from "../shared/crud";
import {
  getBusTrack,
  getDriverBus,
  getFleetSnapshot,
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
transportCustomRouter.get(
  "/driver/incidents",
  requireDriver,
  asyncHandler(listDriverIncidents)
);
