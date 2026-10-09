/**
 * Demo-only GPS simulator.
 *
 * The live map has no real phones driving, so without help every seeded bus
 * fix would silently age past the "fresh" window within seconds and the fleet
 * page would show an empty city. This module reports fixes on the buses'
 * behalf over the exact same channel a real driver would use:
 *
 *   - RUNNING buses drive along their route's stop polyline — position,
 *     speed, heading and `lastLocationAt` all update, and `bus:location` is
 *     emitted so admins, parents and the assigned driver all see movement.
 *   - IDLE / STOPPED vehicles stay parked but keep reporting periodically,
 *     so they read as "connected" instead of drifting to "offline".
 *
 * Opt-in via FLEET_SIMULATION_ENABLED (default true) and isolated from the
 * real GPS ingest path: when a real driver posts a fix the bus turns RUNNING
 * and simply keeps getting simulated movement that matches its real route.
 */
import { prisma } from "../../config/prisma";
import config from "../../config/env";
import { emitBusLocation } from "../../sockets";

interface Point {
  lat: number;
  lng: number;
}

interface Path {
  points: Point[];
  /** `cumulative[i]` = distance in meters from the path start at point i. */
  cumulative: number[];
  /** Total loop length in meters. */
  length: number;
}

const DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Great-circle distance between two coordinates, in meters. */
const haversineM = (a: Point, b: Point): number => {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
};

/** Initial bearing a→b in degrees [0, 360). */
const bearingDeg = (a: Point, b: Point): number => {
  const dLng = (b.lng - a.lng) * DEG;
  const y = Math.sin(dLng) * Math.cos(b.lat * DEG);
  const x =
    Math.cos(a.lat * DEG) * Math.sin(b.lat * DEG) -
    Math.sin(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/** Closed loop of a route's stops (sorted by sequence, back to the first). */
const buildPath = (
  stops: { latitude: number; longitude: number; sequence: number }[]
): Path | null => {
  if (stops.length === 0) return null;
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const points: Point[] = sorted.map((stop) => ({
    lat: stop.latitude,
    lng: stop.longitude,
  }));
  if (points.length === 1) {
    return { points, cumulative: [0], length: 0 };
  }
  points.push(points[0]); // close the loop
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineM(points[i - 1], points[i]));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
};

/** Position + heading at `distance` meters along the loop (distance wraps). */
const pointAt = (path: Path, distance: number): { lat: number; lng: number; heading: number } => {
  if (path.length === 0) {
    const only = path.points[0];
    return { lat: only.lat, lng: only.lng, heading: 0 };
  }
  const d = ((distance % path.length) + path.length) % path.length;
  for (let i = 0; i < path.points.length - 1; i += 1) {
    if (d <= path.cumulative[i + 1]) {
      const segmentLength = path.cumulative[i + 1] - path.cumulative[i] || 1;
      const t = clamp((d - path.cumulative[i]) / segmentLength, 0, 1);
      const a = path.points[i];
      const b = path.points[i + 1];
      return {
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng),
        heading: bearingDeg(a, b),
      };
    }
  }
  const last = path.points[path.points.length - 1];
  return { lat: last.lat, lng: last.lng, heading: 0 };
};

/**
 * Distance in meters along the path nearest to (lat, lng) — used so the very
 * first simulated tick starts at the seeded position instead of snapping the
 * vehicle to a route endpoint.
 */
const projectOnPath = (path: Path, lat: number, lng: number): number => {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < path.points.length - 1; i += 1) {
    const a = path.points[i];
    const b = path.points[i + 1];
    const segmentLength = path.cumulative[i + 1] - path.cumulative[i] || 1;
    const dx = b.lat - a.lat;
    const dy = b.lng - a.lng;
    const t = clamp((dx * (lat - a.lat) + dy * (lng - a.lng)) / (dx * dx + dy * dy || 1), 0, 1);
    const proj = { lat: a.lat + t * dx, lng: a.lng + t * dy };
    const distance = haversineM({ lat, lng }, proj);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = path.cumulative[i] + t * segmentLength;
    }
  }
  return best;
};

/** How often each status re-reports. Higher cadence = fresher readout. */
const shouldReport = (status: string, ticks: number): boolean => {
  if (status === "RUNNING") return true;
  if (status === "IDLE") return true;
  // A parked vehicle with the engine off reports occasionally (engine on with
  // AC / charging), which is enough to read as connected rather than offline.
  return ticks % 3 === 0;
};

// ---------------------------------------------------------------------------
// Demo loop
// ---------------------------------------------------------------------------

let timer: ReturnType<typeof setInterval> | null = null;
let lastTickAt = 0;
const progressByBus = new Map<string, number>();
const tickCountByBus = new Map<string, number>();

const simulateStep = async (dt: number): Promise<void> => {
  const buses = await prisma.bus.findMany({
    where: { isActive: true },
    select: {
      id: true,
      status: true,
      currentLatitude: true,
      currentLongitude: true,
      currentSpeed: true,
      heading: true,
      route: {
        select: {
          stops: {
            orderBy: { sequence: "asc" as const },
            select: { latitude: true, longitude: true, sequence: true },
          },
        },
      },
    },
  });

  const now = new Date();
  const timestamp = now.toISOString();

  for (const bus of buses) {
    const hasCoords =
      Number.isFinite(bus.currentLatitude) && Number.isFinite(bus.currentLongitude);
    const path = buildPath(bus.route?.stops ?? []);

    // Seed each vehicle's progress once by projecting its current position
    // onto the route, so the first tick never teleports it.
    if (path && path.length > 0 && !progressByBus.has(bus.id)) {
      const start = hasCoords
        ? { lat: bus.currentLatitude as number, lng: bus.currentLongitude as number }
        : path.points[0];
      progressByBus.set(bus.id, projectOnPath(path, start.lat, start.lng));
    }

    const ticks = (tickCountByBus.get(bus.id) ?? 0) + 1;
    tickCountByBus.set(bus.id, ticks);

    if (bus.status === "RUNNING" && path && path.length > 0) {
      // Drive along the route at the vehicle's recorded speed.
      const speedKmh = Math.max(0, bus.currentSpeed ?? 0);
      const progress = progressByBus.get(bus.id) ?? 0;
      const travelled = progress + (speedKmh / 3.6) * dt;
      const next = travelled >= path.length ? travelled % path.length : travelled;
      progressByBus.set(bus.id, next);

      const { lat, lng, heading } = pointAt(path, next);
      await prisma.bus.update({
        where: { id: bus.id },
        data: {
          currentLatitude: lat,
          currentLongitude: lng,
          currentSpeed: speedKmh,
          heading: Math.round(heading),
          lastLocationAt: now,
        },
      });

      emitBusLocation({
        busId: bus.id,
        latitude: lat,
        longitude: lng,
        speed: speedKmh,
        heading: Math.round(heading),
        accuracy: 3,
        status: bus.status,
        timestamp,
      });
    } else if (hasCoords && shouldReport(bus.status, ticks)) {
      // Parked but connected: refresh the fix in place.
      await prisma.bus.update({ where: { id: bus.id }, data: { lastLocationAt: now } });
      emitBusLocation({
        busId: bus.id,
        latitude: bus.currentLatitude as number,
        longitude: bus.currentLongitude as number,
        speed: bus.currentSpeed ?? 0,
        heading: bus.heading ?? 0,
        accuracy: 3,
        status: bus.status,
        timestamp,
      });
    }
  }
};

/** Starts the demo loop. Safe to call more than once. */
export const startFleetSimulator = (): void => {
  if (timer || !config.fleetSimulationEnabled) return;
  const intervalMs = Math.max(2, config.fleetSimulationTickSeconds) * 1000;
  lastTickAt = Date.now();
  timer = setInterval(() => {
    const now = Date.now();
    // Cap the elapsed time so a laptop coming back from sleep does not
    // teleport every vehicle to the far end of its route.
    const dt = Math.min((now - lastTickAt) / 1000, 20);
    lastTickAt = now;
    void simulateStep(dt).catch((error) => {
      console.error("[fleet-simulator]", error);
    });
  }, intervalMs);
};

export const stopFleetSimulator = (): void => {
  if (timer) clearInterval(timer);
  timer = null;
  progressByBus.clear();
  tickCountByBus.clear();
};