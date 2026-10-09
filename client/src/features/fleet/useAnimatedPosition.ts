/**
 * Smooth interpolation between two GPS fixes.
 *
 * A marker must never teleport: it glides from the previous fix to the next
 * one over the *interval the server reported between those fixes*, so the
 * on-screen speed matches reality. When updates stop arriving (delayed or
 * dropped), the marker stops moving and the freshness badge — not the
 * animation — tells the truth.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** Fixes further apart than this snap instead of gliding across the map. */
const SNAP_GAP_MS = 15_000;
/** Never animate faster than this, even for sub-second GPS bursts. */
const MIN_ANIM_MS = 700;
/** …and never slower than this, so a long gap still feels responsive. */
const MAX_ANIM_MS = 12_000;

interface Point {
  lat: number;
  lng: number;
}

interface AnimationState {
  current: Point | null;
  from: Point | null;
  to: Point | null;
  startedAt: number;
  duration: number;
  raf: number;
  previousTimestamp: string | null;
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * Returns the displayed position for a vehicle: `null` while it has never
 * reported, otherwise a point that eases towards each new fix.
 *
 * @param latitude  latest latitude, or `null` when the bus has no fix
 * @param longitude latest longitude
 * @param timestamp the server-side `lastLocationAt` of that fix
 */
export const useAnimatedPosition = (
  latitude: number | null,
  longitude: number | null,
  timestamp: string | null
): [number, number] | null => {
  const hasFix =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const [displayed, setDisplayed] = useState<[number, number] | null>(() =>
    hasFix ? [latitude as number, longitude as number] : null
  );

  const state = useRef<AnimationState>({
    current: hasFix ? { lat: latitude as number, lng: longitude as number } : null,
    from: null,
    to: null,
    startedAt: 0,
    duration: 0,
    raf: 0,
    previousTimestamp: timestamp,
  });

  const tick = useCallback(() => {
    const s = state.current;
    if (!s.from || !s.to || !s.current) {
      s.raf = 0;
      return;
    }

    const elapsed = Date.now() - s.startedAt;
    const t = s.duration > 0 ? Math.min(1, elapsed / s.duration) : 1;
    const next = {
      lat: lerp(s.from.lat, s.to.lat, t),
      lng: lerp(s.from.lng, s.to.lng, t),
    };
    s.current = next;
    setDisplayed([next.lat, next.lng]);

    if (t >= 1) {
      s.raf = 0;
      s.from = null;
      s.to = null;
      return;
    }
    s.raf = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const s = state.current;

    if (!hasFix) {
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.current = null;
      s.from = null;
      s.to = null;
      s.previousTimestamp = null;
      setDisplayed(null);
      return;
    }

    const target: Point = { lat: latitude as number, lng: longitude as number };

    // Interval the *server* observed between this fix and the previous one.
    let gapMs = 0;
    if (s.current && s.previousTimestamp && timestamp) {
      const previous = Date.parse(s.previousTimestamp);
      const current = Date.parse(timestamp);
      if (Number.isFinite(previous) && Number.isFinite(current)) {
        gapMs = current - previous;
      }
    }
    s.previousTimestamp = timestamp;

    const isRecovery = gapMs > SNAP_GAP_MS || gapMs <= 0;
    const isFirstFix = !s.current || !s.to;

    if (isFirstFix || isRecovery) {
      // First sighting, or a gap long enough that gliding would be a lie:
      // place the vehicle exactly where the server says it is.
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.current = target;
      s.from = null;
      s.to = null;
      setDisplayed([target.lat, target.lng]);
      return;
    }

    if (s.raf) cancelAnimationFrame(s.raf);
    s.from = s.current;
    s.to = target;
    s.startedAt = Date.now();
    s.duration = Math.min(Math.max(gapMs, MIN_ANIM_MS), MAX_ANIM_MS);
    s.raf = requestAnimationFrame(tick);
  }, [hasFix, latitude, longitude, timestamp, tick]);

  // Abort any in-flight animation when the component unmounts.
  useEffect(
    () => () => {
      const s = state.current;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    },
    []
  );

  return displayed;
};
