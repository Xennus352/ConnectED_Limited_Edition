

export const FRESHNESS_LABELS: Record<string, string> = {
  LIVE: "fleet.freshness.live",
  DELAYED: "fleet.freshness.delayed",
  STALE: "fleet.freshness.stale",
  OFFLINE: "fleet.freshness.offline",
} as const;

export const FRESHNESS_KEY = FRESHNESS_LABELS;
export default FRESHNESS_KEY;
