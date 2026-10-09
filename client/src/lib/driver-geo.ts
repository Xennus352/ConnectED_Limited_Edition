/**
 * Route geometry helpers for the driver UI.
 *
 * Everything here is DERIVED from real data — the bus' last GPS fix and the
 * stored route stop coordinates. No server data is invented; when there is
 * no fix or no usable stops these helpers simply return `null`.
 *
 * Distances use the equirectangular approximation (fine at city scale).
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PolylineStop extends GeoPoint {
  id?: string;
  name?: string;
  sequence?: number;
}

/** Equirectangular distance in kilometres between two lat/lng points. */
export const distanceKm = (a: GeoPoint, b: GeoPoint): number => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = dLng * Math.cos((lat1 + lat2) / 2);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
};

const isValidStop = (stop: PolylineStop): boolean =>
  Number.isFinite(stop.latitude) &&
  Number.isFinite(stop.longitude) &&
  !(stop.latitude === 0 && stop.longitude === 0);

export interface RouteProgress {
  /** What share of the polyline the bus has covered, 0..1. */
  fraction: number;
  /** Index of the last reached stop, or -1 when still before stop #1. */
  currentIndex: number;
  /** The stop the bus has reached (never past the last one). */
  currentStop: PolylineStop | null;
  /** The next stop ahead of the bus, or null at the end of the route. */
  nextStop: PolylineStop | null;
  /** Distance in km from the route start to the projected position. */
  travelledKm: number;
  /** Total route length in km. */
  totalKm: number;
  /** Remaining distance to the *next* stop (from the projected position). */
  remainingToNextKm: number | null;
  /** Estimated minutes to the next stop using the current speed. */
  etaMinutes: number | null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Projects a bus position onto the stop-to-stop polyline and reports how far
 * it has travelled, which stop it is at, and an ETA — all from real inputs.
 *
 * `speedKmh` comes straight from the live GPS payload; when it is ~0 the ETA
 * is unknown rather than "infinite".
 */
export const projectOnRoute = (
  stops: PolylineStop[],
  position: GeoPoint | null,
  speedKmh: number | null = null
): RouteProgress | null => {
  const usable = stops.filter(isValidStop).sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
  );
  if (usable.length < 2 || !position) return null;
  if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) {
    return null;
  }

  // Cumulative distance at the start of every stop + total length.
  const starts: number[] = [0];
  let cumulative = 0;
  for (let i = 1; i < usable.length; i += 1) {
    cumulative += distanceKm(usable[i - 1], usable[i]);
    starts.push(cumulative);
  }
  const totalKm = cumulative;

  // Project the bus onto the nearest segment, then re-measure from the start
  // so the result is along-route distance (not straight-line).
  let bestSegment = 0;
  let bestParam = 0;
  let bestAlong = Number.POSITIVE_INFINITY;
  for (let i = 0; i < usable.length - 1; i += 1) {
    const a = usable[i];
    const b = usable[i + 1];
    const segLen = distanceKm(a, b);
    if (segLen < 1e-6) continue;

    const ax = a.longitude || 0;
    const ay = a.latitude || 0;
    const bx = b.longitude || 0;
    const by = b.latitude || 0;
    const px = position.longitude || 0;
    const py = position.latitude || 0;

    const t = clamp(
      ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) /
        ((bx - ax) * (bx - ax) + (by - ay) * (by - ay)),
      0,
      1
    );
    const proj = {
      latitude: ay + t * (by - ay),
      longitude: ax + t * (bx - ax),
    };
    const along = starts[i] + distanceKm(a, proj) * segLen / Math.max(segLen, 1e-6);
    if (along < bestAlong) {
      bestAlong = along;
      bestSegment = i;
      bestParam = t;
    }
  }
  // Correct the along-route distance (use real distance from segment start).
  const a = usable[bestSegment];
  const projPoint: GeoPoint = {
    latitude:
      a.latitude + bestParam * (usable[bestSegment + 1].latitude - a.latitude),
    longitude:
      a.longitude +
      bestParam * (usable[bestSegment + 1].longitude - a.longitude),
  };
  const travelledKm = starts[bestSegment] + distanceKm(a, projPoint);

  // Which stop is the bus AT (the last reached stop), never past the last.
  let reached = -1;
  for (let i = 0; i < usable.length; i += 1) {
    if (travelledKm >= starts[i] - 1e-9) reached = i;
  }
  if (reached >= usable.length - 1) reached = usable.length - 1;

  const currentStop = usable[reached];
  const nextStop = reached < usable.length - 1 ? usable[reached + 1] : null;

  let remainingToNextKm: number | null = null;
  if (nextStop) {
    const nextStartKm = starts[reached + 1];
    remainingToNextKm = Math.max(0, nextStartKm - travelledKm);
  }

  let etaMinutes: number | null = null;
  if (remainingToNextKm !== null && speedKmh && speedKmh > 2) {
    etaMinutes = Math.max(1, Math.round((remainingToNextKm / speedKmh) * 60));
  }

  return {
    fraction: totalKm > 0 ? clamp(travelledKm / totalKm, 0, 1) : 0,
    currentIndex: reached,
    currentStop,
    nextStop,
    travelledKm,
    totalKm,
    remainingToNextKm,
    etaMinutes,
  };
};