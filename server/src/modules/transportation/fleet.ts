import type { Request, Response } from "express";

import config from "../../config/env";
import { prisma } from "../../config/prisma";
import { forbidden, notFound, unauthorized } from "../../lib/errors";
import { hasBlockingMaintenance } from "./availability";

/**
 * Fleet snapshot + tracking queries.
 *
 * The map renders its first frame from these snapshots (one request), then
 * relies on `bus:location` / `bus:status` for movement. Nothing here polls.
 *
 * Every query resolves a *scope* from the authenticated role:
 *
 *   admin / super-admin -> the whole fleet
 *   driver              -> only their assigned bus
 *   parent              -> only buses their children ride
 *   anyone else         -> nothing
 *
 * Frontend filtering is cosmetic; this scope (and the socket rooms in
 * `sockets.ts`) is the actual authorization.
 */

const routeInclude = {
  id: true,
  name: true,
  description: true,
  startLocation: true,
  endLocation: true,
  estimatedDuration: true,
  isActive: true,
  stops: {
    orderBy: { sequence: "asc" as const },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      sequence: true,
      estimatedArrival: true,
      isActive: true,
    },
  },
};

const busInclude = {
  route: { select: routeInclude },
  driver: {
    select: { id: true, fullName: true, phoneNumber: true, profilePhoto: true },
  },
} as const;

/** `null` = fleet-wide, `[]` = no access, otherwise the allowed bus ids. */
export interface FleetScope {
  busIds: string[] | null;
  /** Whether this role may see the names of students riding a bus. */
  seesStudentNames: boolean;
  /** Parent: which students (by id) this user may see on a given bus. */
  ownStudentIds: string[];
}

/**
 * Resolves which vehicle a driver currently operates.
 *
 * The link exists on both sides — `Driver.busId` (used for realtime room
 * membership and GPS authorization) and `Bus.driverId` (written by the admin
 * form) — so either one counts as proof of assignment. This keeps a driver
 * usable no matter which side the last write touched.
 */
export const resolveDriverBusId = async (driverId: string): Promise<string | null> => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { busId: true },
  });
  if (driver?.busId) return driver.busId;

  const bus = await prisma.bus.findFirst({
    where: { driverId },
    select: { id: true },
  });
  return bus?.id ?? null;
};

export const resolveScope = async (req: Request): Promise<FleetScope> => {
  const user = req.user;
  if (!user) throw unauthorized();

  const role = user.role?.toLowerCase?.() ?? "";

  if (role === "admin" || role === "super-admin") {
    return { busIds: null, seesStudentNames: true, ownStudentIds: [] };
  }

  if (role === "driver") {
    const busId = await resolveDriverBusId(user.id);
    return {
      busIds: busId ? [busId] : [],
      seesStudentNames: false,
      ownStudentIds: [],
    };
  }

  if (role === "parent") {
    const children = await prisma.student.findMany({
      where: { parentId: user.id },
      select: {
        id: true,
        fullName: true,
        busAssignments: {
          where: { isActive: true },
          select: { busId: true },
        },
      },
    });

    const busIds = new Set<string>();
    for (const child of children) {
      for (const assignment of child.busAssignments ?? []) {
        if (assignment.busId) busIds.add(assignment.busId);
      }
    }

    return {
      busIds: [...busIds],
      // A parent only ever sees their own children's names.
      seesStudentNames: true,
      ownStudentIds: children.map((child) => child.id),
    };
  }

  // Students and teachers have no fleet-wide (or any) telemetry access.
  if (role === "student") {
    return { busIds: [], seesStudentNames: false, ownStudentIds: [] };
  }

  // Teachers have no fleet-wide (or any) telemetry access.
  return { busIds: [], seesStudentNames: false, ownStudentIds: [] };
};

/** Freshness thresholds + map settings handed to the client once. */
const snapshotMeta = () => ({
  serverTime: new Date().toISOString(),
  thresholds: {
    freshSeconds: config.locationFreshSeconds,
    delayedSeconds: config.locationDelayedSeconds,
    staleSeconds: config.locationStaleSeconds,
  },
  map: {
    tileUrl: config.mapTileUrl,
    tileAttribution: config.mapTileAttribution,
    center: [config.mapCenterLatitude, config.mapCenterLongitude] as [number, number],
    zoom: config.mapDefaultZoom,
  },
});

interface RawBus {
  id: string;
  busNumber: string;
  name: string;
  registrationNumber: string;
  capacity: number;
  status: string;
  isActive: boolean;
  currentLatitude: number;
  currentLongitude: number;
  currentSpeed: number;
  heading: number;
  lastLocationAt: Date | null;
  route: any;
  driver: any;
  studentAssignments: Array<{
    studentId: string;
    pickupStopId?: string | null;
    dropoffStopId?: string | null;
    student: { id: string; fullName: string };
  }>;
}

/**
 * Shapes a bus row for the map. Coordinates of `0,0` mean "never reported"
 * and are nulled so the marker is not dropped in the Gulf of Guinea.
 */
const presentBus = (
  bus: RawBus,
  scope: FleetScope
): Record<string, unknown> => {
  const assignments = bus.studentAssignments ?? [];
  const scopedAssignments = scope.ownStudentIds.length
    ? assignments.filter((a) => scope.ownStudentIds.includes(a.studentId))
    : assignments;

  const hasFix =
    Number.isFinite(bus.currentLatitude) &&
    Number.isFinite(bus.currentLongitude) &&
    !(bus.currentLatitude === 0 && bus.currentLongitude === 0);

  /**
   * How many (permitted) students board at a given stop. Omitted entirely
   * when the role may not see student information at all.
   */
  const ridersAt = (stopId?: string | null): number | undefined => {
    if (!scope.seesStudentNames || !stopId) return undefined;
    return scopedAssignments.filter((a) => a.pickupStopId === stopId).length;
  };

  const stops = (bus.route?.stops ?? []).filter(
    (stop: any) => stop.isActive !== false
  );

  return {
    id: bus.id,
    busNumber: bus.busNumber,
    name: bus.name,
    registrationNumber: bus.registrationNumber,
    capacity: bus.capacity,
    status: bus.status,
    isActive: bus.isActive,
    latitude: hasFix ? bus.currentLatitude : null,
    longitude: hasFix ? bus.currentLongitude : null,
    speed: bus.currentSpeed ?? 0,
    heading: bus.heading ?? 0,
    lastLocationAt: bus.lastLocationAt ? bus.lastLocationAt.toISOString() : null,
    route: bus.route
      ? {
          id: bus.route.id,
          name: bus.route.name,
          description: bus.route.description,
          startLocation: bus.route.startLocation,
          endLocation: bus.route.endLocation,
          estimatedDuration: bus.route.estimatedDuration,
          stops: stops.map((stop: any) => {
            const studentCount = ridersAt(stop.id);
            return studentCount === undefined
              ? stop
              : { ...stop, studentCount };
          }),
        }
      : null,
    driver: bus.driver ?? null,
    studentCount: assignments.length,
    // Names are role-gated: parents only ever get their own children, and a
    // driver (who may not see student information at all) gets an empty list.
    // `pickupStopId` lets the map name the riders waiting at each stop.
    students: scope.seesStudentNames
      ? scopedAssignments.map((assignment) => ({
          ...assignment.student,
          pickupStopId: assignment.pickupStopId ?? null,
          dropoffStopId: assignment.dropoffStopId ?? null,
        }))
      : [],
  };
};

/**
 * GET /api/admin/fleet  (also mounted at /api/fleet and /api/parent/fleet)
 * One snapshot: every bus this role may see, with route, stops and driver.
 */
export const getFleetSnapshot = async (req: Request, res: Response) => {
  const scope = await resolveScope(req);

  const where =
    scope.busIds === null
      ? {}
      : scope.busIds.length
        ? { id: { in: scope.busIds } }
        : { id: { in: [] as string[] } };

  const buses = await prisma.bus.findMany({
    where,
    include: {
      ...busInclude,
      studentAssignments: {
        where: { isActive: true },
        select: {
          studentId: true,
          pickupStopId: true,
          dropoffStopId: true,
          student: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: { busNumber: "asc" },
  });

  res.json({
    success: true,
    data: {
      buses: buses.map((bus) => presentBus(bus as unknown as RawBus, scope)),
    },
    meta: snapshotMeta(),
  });
};

/**
 * GET /api/buses/:id/track
 * Route geometry + stops for one bus, scoped to the caller's permissions.
 * Used when a bus is selected so the polyline comes from stored route data.
 */
export const getBusTrack = async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const busId = String(req.params.id || "");

  const allowed =
    scope.busIds === null ||
    (scope.busIds !== null && scope.busIds.includes(busId));
  if (!allowed) throw forbidden("You don't have permission to view this vehicle");

  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      ...busInclude,
      studentAssignments: {
        where: { isActive: true },
        select: {
          studentId: true,
          pickupStopId: true,
          dropoffStopId: true,
          student: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  if (!bus) throw notFound("Vehicle not found");

  res.json({
    success: true,
    data: presentBus(bus as unknown as RawBus, scope),
    meta: snapshotMeta(),
  });
};

/**
 * GET /api/driver/bus
 * The signed-in driver's own vehicle + route, for /driver/location.
 */
export const getDriverBus = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || user.role?.toLowerCase?.() !== "driver") {
    throw forbidden("Only drivers can view this resource");
  }

  const driver = await prisma.driver.findUnique({
    where: { id: user.id },
    select: { id: true, fullName: true },
  });
  if (!driver) throw notFound("Driver not found");

  const busId = await resolveDriverBusId(driver.id);
  if (!busId) {
    // No bus assigned yet — an empty payload is a valid, honest state.
    res.json({ success: true, data: null, meta: snapshotMeta() });
    return;
  }

  const [bus, blockedByMaintenance] = await Promise.all([
    prisma.bus.findUnique({
      where: { id: busId },
      include: {
        ...busInclude,
        studentAssignments: {
          where: { isActive: true },
          select: { studentId: true, student: { select: { id: true, fullName: true } } },
        },
      },
    }),
    hasBlockingMaintenance(busId),
  ]);

  res.json({
    success: true,
    data: bus
      ? {
          ...presentBus(bus as unknown as RawBus, {
            busIds: [bus.id],
            seesStudentNames: false,
            ownStudentIds: [],
          }),
          driver: { id: driver.id, fullName: driver.fullName },
          hasBlockingMaintenance: blockedByMaintenance,
        }
      : null,
    meta: snapshotMeta(),
  });
};
