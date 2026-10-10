import type { StopOption } from "./types";

/** Extracts a `[lat, lng]` pair from common share-location link formats. */
export const parseLocationLink = (input: string): [number, number] | null => {
  const text = input.trim();
  if (!text) return null;

  // geo:lat,lng  (also plain coords with a leading slash)
  const geo = text.match(
    /geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i
  );
  if (geo) return [parseFloat(geo[1]), parseFloat(geo[2])];

  // Google Maps style tokens: @lat,lng · q=lat,lng · center=lat,lng · ll= · daddr=
  for (const token of ["@", "q=", "center=", "ll=", "daddr="]) {
    const idx = text.indexOf(token);
    if (idx === -1) continue;
    const rest = text.slice(idx + token.length);
    const m = rest.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }

  // Plain "lat, lng"
  const plain = text.match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/
  );
  if (plain) return [parseFloat(plain[1]), parseFloat(plain[2])];

  return null;
};

/** Approximate great-circle distance in kilometres. */
export const distanceKm = (
  a: [number, number],
  b: [number, number]
): number => {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
};

/** The plottable (real, non-zero) route stop closest to `point`. */
export const nearestStop = (
  point: [number, number],
  stops: StopOption[]
): StopOption | null => {
  let best: StopOption | null = null;
  let bestDistance = Infinity;

  for (const stop of stops) {
    if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) {
      continue;
    }
    if (stop.latitude === 0 && stop.longitude === 0) continue;
    const d = distanceKm(point, [stop.latitude, stop.longitude]);
    if (d < bestDistance) {
      bestDistance = d;
      best = stop;
    }
  }

  return best;
};