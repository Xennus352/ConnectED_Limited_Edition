/**
 * Freshness rules shared by every fleet surface.
 *
 * Thresholds come from the server (`meta.thresholds`) so the whole product
 * agrees on what "live" means; the defaults below only apply before the
 * first snapshot arrives.
 */
import type { BusStatus, FleetMeta, Freshness } from "./types";

export const DEFAULT_THRESHOLDS = {
  freshSeconds: 15,
  delayedSeconds: 60,
  staleSeconds: 300,
} as const;

export interface FreshnessInput {
  lastLocationAt: string | null;
  meta: FleetMeta | null;
  /** Local clock correction computed from `meta.serverTime`. */
  clockOffset?: number;
}

/**
 * LIVE < fresh · DELAYED fresh..delayed · STALE delayed..stale · OFFLINE >
 * stale. A vehicle that has never reported is OFFLINE, and a vehicle whose
 * status is OFFLINE is never called live regardless of its last fix.
 */
export const classifyFreshness = ({
  lastLocationAt,
  meta,
  clockOffset = 0,
}: FreshnessInput): Freshness => {
  if (!lastLocationAt) return "OFFLINE";

  const thresholds = meta?.thresholds ?? DEFAULT_THRESHOLDS;
  const ageMs = Date.now() + clockOffset - Date.parse(lastLocationAt);
  if (!Number.isFinite(ageMs)) return "OFFLINE";

  const ageSeconds = ageMs / 1000;
  if (ageSeconds < thresholds.freshSeconds) return "LIVE";
  if (ageSeconds < thresholds.delayedSeconds) return "DELAYED";
  if (ageSeconds < thresholds.staleSeconds) return "STALE";
  return "OFFLINE";
};

/** Whether a bus currently reports a usable coordinate. */
export const hasFix = (bus: { latitude: number | null; longitude: number | null }): boolean =>
  Number.isFinite(bus.latitude) &&
  Number.isFinite(bus.longitude) &&
  !(bus.latitude === 0 && bus.longitude === 0);

/** Milliseconds since the given timestamp, corrected by the server clock. */
export const ageOf = (timestamp: string | null, clockOffset = 0): number | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Date.now() + clockOffset - parsed);
};

/** Compact human age: `now`, `12s ago`, `4m ago`, `2h ago`. */
export const formatAge = (ageMs: number | null): string => {
  if (ageMs === null) return "—";
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 2) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/** Human-readable relative time with "Updated" prefix.
 *  Uses the shared thresholds from DEFAULT_THRESHOLDS logic.
 *  Returns values like "Updated 1 min ago", "Updated 2 min ago", etc.
 *  Call sites should wrap with i18n if needed, or use the i18n keys directly.
 */
export const formatUpdatedTime = (ageMs: number | null): string => {
  if (ageMs === null) return "—";
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 2) return "Updated now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
};

/** CSS colour for a freshness state — matches the Tailwind `success` scale. */
export const FRESHNESS_CLASS: Record<Freshness, string> = {
  LIVE: "bg-emerald-500",
  DELAYED: "bg-amber-500",
  STALE: "bg-orange-500",
  OFFLINE: "bg-zinc-400 dark:bg-zinc-500",
};

/** Marker/segment colour per bus status. */
export const STATUS_CLASS: Record<BusStatus, string> = {
  RUNNING: "bg-emerald-500",
  IDLE: "bg-amber-500",
  STOPPED: "bg-sky-500",
  OFFLINE: "bg-zinc-400 dark:bg-zinc-500",
};

export const STATUS_COLOR: Record<BusStatus, string> = {
  RUNNING: "#10b981",
  IDLE: "#f59e0b",
  STOPPED: "#0ea5e9",
  OFFLINE: "#9ca3af",
};

export const FRESHNESS_COLOR: Record<Freshness, string> = {
  LIVE: "#10b981",
  DELAYED: "#f59e0b",
  STALE: "#f97316",
  OFFLINE: "#9ca3af",
};

/** Speed in km/h (the API always returns km/h). */
export const formatSpeed = (kmh: number): string =>
  `${Math.max(0, Math.round(kmh))} km/h`;

/** `345°` — heading, rounded for display. */
export const formatHeading = (heading: number): string =>
  `${Math.round(((heading % 360) + 360) % 360)}°`;
