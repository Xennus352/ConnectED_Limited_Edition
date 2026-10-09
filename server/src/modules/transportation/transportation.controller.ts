import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { emitBusLocation, emitBusStatus } from "../../sockets";
import { resolveDriverBusId } from "./fleet";

const isValidLat = (v: number) => Number.isFinite(v) && v >= -90 && v <= 90;
const isValidLng = (v: number) => Number.isFinite(v) && v >= -180 && v <= 180;

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Clamps a heading into [0, 360) — GPS devices report 0..359.9. */
const normalizeHeading = (value: unknown): number => {
  const heading = num(value, 0) % 360;
  return heading < 0 ? heading + 360 : heading;
};

/** Speed is stored in km/h; reject nonsense rather than persisting it. */
const normalizeSpeed = (value: unknown): number => {
  const speed = num(value, 0);
  return speed < 0 ? 0 : Math.min(speed, 400);
};

/**
 * POST /api/buses/:id/location
 *
 * Driver GPS ingestion. The bus id comes from the URL and MUST belong to the
 * authenticated driver — a driver can never write another vehicle's position.
 * On success the current state row is updated, the historical point appended,
 * and `bus:location` is emitted to authorized subscribers only.
 */
export const updateDriverLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "driver") {
      throw forbidden("Only drivers can update a bus location");
    }

    const busId = String(req.params.id || "");
    if (!busId) throw badRequest("Missing bus id");

    const { latitude, longitude } = req.body || {};
    if (!isValidLat(Number(latitude)) || !isValidLng(Number(longitude))) {
      throw badRequest("Invalid coordinates");
    }

    const driver = await prisma.driver.findUnique({
      where: { id: user.id },
      select: { id: true, busId: true },
    });
    if (!driver) throw notFound("Driver not found");

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) throw notFound("Bus not found");

    // Authorization: this driver must be assigned to THIS bus.
    const assignedBusId = await resolveDriverBusId(driver.id);
    if (assignedBusId !== busId) {
      throw forbidden("You are not assigned to this bus");
    }

    const now = new Date();
    const speed = normalizeSpeed(req.body?.speed);
    const heading = normalizeHeading(req.body?.heading);
    const accuracy = Math.max(0, num(req.body?.accuracy, 0));

    // A live GPS fix from the assigned driver means the vehicle is being
    // tracked, so any non-RUNNING state flips to RUNNING — the map never
    // shows a "stopped" bus that is actively reporting movement.
    const status = "RUNNING";

    await prisma.bus.update({
      where: { id: busId },
      data: {
        currentLatitude: Number(latitude),
        currentLongitude: Number(longitude),
        currentSpeed: speed,
        heading,
        lastLocationAt: now,
        status,
      },
    });

    // Historical trail lives in its own collection — the map renders from the
    // current-state row above, never from this table.
    await prisma.busLocation.create({
      data: {
        busId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        speed,
        heading,
        accuracy,
        recordedAt: now,
      },
    });

    const timestamp = now.toISOString();

    emitBusLocation({
      busId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed,
      heading,
      accuracy,
      status,
      timestamp,
    });

    if (status !== bus.status) {
      emitBusStatus({ busId, status, lastLocationAt: timestamp, timestamp });
    }

    res.json({ success: true, data: { busId, status, lastLocationAt: timestamp } });
  } catch (e) {
    next(e);
  }
};

/** POST /api/buses/:id/start-trip */
export const startTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "driver") throw forbidden("Only drivers");

    const busId = String(req.params.id || "");
    const driver = await prisma.driver.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (!driver) throw notFound("Driver not found");

    const assignedBusId = await resolveDriverBusId(driver.id);
    if (!assignedBusId) throw notFound("No assigned bus");
    if (assignedBusId !== busId) throw forbidden("You are not assigned to this bus");

    const now = new Date();
    const bus = await prisma.bus.update({
      where: { id: busId },
      data: { status: "RUNNING", lastLocationAt: now },
    });

    const timestamp = now.toISOString();
    emitBusStatus({ busId, status: bus.status, lastLocationAt: timestamp, timestamp });

    res.json({ success: true, data: bus });
  } catch (e) {
    next(e);
  }
};

/** POST /api/buses/:id/stop-trip */
export const stopTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "driver") throw forbidden("Only drivers");

    const busId = String(req.params.id || "");
    const driver = await prisma.driver.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (!driver) throw notFound("Driver not found");

    const assignedBusId = await resolveDriverBusId(driver.id);
    if (!assignedBusId) throw notFound("No assigned bus");
    if (assignedBusId !== busId) throw forbidden("You are not assigned to this bus");

    const now = new Date();
    const bus = await prisma.bus.update({
      where: { id: busId },
      data: { status: "STOPPED", currentSpeed: 0, lastLocationAt: now },
    });

    const timestamp = now.toISOString();
    emitBusStatus({ busId, status: bus.status, lastLocationAt: timestamp, timestamp });

    res.json({ success: true, data: bus });
  } catch (e) {
    next(e);
  }
};
