import React from "react";

import type { UseDriverWorkspaceReturn } from "./workspace-types";

export type DriverAlertCategory =
  | "GPS"
  | "TRIP"
  | "ROUTE"
  | "MAINTENANCE"
  | "INCIDENT"
  | "SYSTEM";

export type DriverAlertSeverity = "info" | "warning" | "critical";

export interface DriverAlert {
  /** Stable id — used for the persisted read/unread state. */
  id: string;
  category: DriverAlertCategory;
  severity: DriverAlertSeverity;
  /** i18n key + interpolation values so alerts stay localised. */
  titleKey: string;
  titleValues?: Record<string, string | number>;
  descriptionKey?: string;
  descriptionValues?: Record<string, string | number>;
  /** Epoch ms — displayed as relative time. */
  time: number;
  /** Optional user-facing action. */
  action?: "reconnect" | "report" | "open-map" | "open-trips";
}

const SEVERITY_BY_INCIDENT: Record<string, DriverAlertSeverity> = {
  CRITICAL: "critical",
  HIGH: "critical",
  MEDIUM: "warning",
  LOW: "info",
};

/**
 * Builds the driver's alert feed from REAL state only:
 *  - incidents the driver reported (server records)
 *  - trips that are delayed / in progress / completed today (server records)
 *  - live system conditions (socket connection, GPS freshness, maintenance
 *    restriction, bus activity)
 * Nothing here is invented — when the data is absent the alert disappears.
 */
export const buildDriverAlerts = (
  workspace: UseDriverWorkspaceReturn
): DriverAlert[] => {
  const alerts: DriverAlert[] = [];
  const now = Date.now();
  const { assigned, freshness, connection, trips, incidents } = workspace;

  // --- System / connection -------------------------------------------------
  if (connection.status === "DISCONNECTED") {
    alerts.push({
      id: "sys-connection",
      category: "SYSTEM",
      severity: "critical",
      titleKey: "driver_alerts.connection_lost",
      descriptionKey: "driver_alerts.connection_lost_desc",
      time: now,
      action: "reconnect",
    });
  }

  if (assigned) {
    if (freshness === "OFFLINE") {
      alerts.push({
        id: "sys-gps-offline",
        category: "GPS",
        severity: "critical",
        titleKey: "driver_alerts.gps_offline",
        descriptionKey: "driver_alerts.gps_offline_desc",
        time: now,
        action: "reconnect",
      });
    } else if (freshness === "STALE") {
      alerts.push({
        id: "sys-gps-stale",
        category: "GPS",
        severity: "warning",
        titleKey: "driver_alerts.gps_stale",
        descriptionKey: "driver_alerts.gps_stale_desc",
        time: now,
      });
    }

    if (assigned.isActive === false) {
      alerts.push({
        id: "sys-bus-inactive",
        category: "SYSTEM",
        severity: "critical",
        titleKey: "driver_alerts.bus_inactive",
        descriptionKey: "driver_alerts.bus_inactive_desc",
        time: now,
        action: "report",
      });
    }

    if ((assigned as any).hasBlockingMaintenance === true) {
      alerts.push({
        id: "sys-maintenance",
        category: "MAINTENANCE",
        severity: "warning",
        titleKey: "driver_alerts.maintenance_blocked",
        descriptionKey: "driver_alerts.maintenance_blocked_desc",
        time: now,
        action: "open-trips",
        titleValues: { bus: assigned.busNumber },
      });
    }
  }

  // --- Trips ----------------------------------------------------------------
  for (const trip of trips) {
    const routeName = trip.route?.name || "—";
    const startedAt = trip.scheduledStartAt
      ? Date.parse(trip.scheduledStartAt)
      : now;

    if (trip.status === "DELAYED" && trip.delayMinutes) {
      alerts.push({
        id: `trip-${trip._id}-delayed`,
        category: "TRIP",
        severity: "warning",
        titleKey: "driver_alerts.trip_delayed",
        descriptionKey: "driver_alerts.trip_delayed_desc",
        titleValues: { minutes: trip.delayMinutes, route: routeName },
        descriptionValues: { route: routeName, minutes: trip.delayMinutes },
        time: startedAt,
        action: "open-trips",
      });
    }
    if (trip.status === "IN_PROGRESS") {
      alerts.push({
        id: `trip-${trip._id}-running`,
        category: "TRIP",
        severity: "info",
        titleKey: "driver_alerts.trip_in_progress",
        descriptionKey: "driver_alerts.trip_in_progress_desc",
        titleValues: { route: routeName },
        descriptionValues: { route: routeName },
        time: startedAt,
        action: "open-map",
      });
    }
    if (trip.status === "COMPLETED" && startedAt >= now - 24 * 3600 * 1000) {
      alerts.push({
        id: `trip-${trip._id}-completed`,
        category: "TRIP",
        severity: "info",
        titleKey: "driver_alerts.trip_completed",
        descriptionKey: "driver_alerts.trip_completed_desc",
        titleValues: { route: routeName },
        descriptionValues: { route: routeName },
        time: startedAt,
      });
    }
  }

  // --- Incidents ------------------------------------------------------------
  for (const incident of incidents as any[]) {
    const occurredAt = incident.occurredAt
      ? Date.parse(incident.occurredAt)
      : now;
    alerts.push({
      id: `inc-${incident._id || incident.id}`,
      category: "INCIDENT",
      severity: SEVERITY_BY_INCIDENT[incident.severity] ?? "warning",
      titleKey: "driver_alerts.incident",
      titleValues: {
        type: String(incident.type || "OTHER").toLowerCase().replace(/_/g, " "),
      },
      descriptionKey: "driver_alerts.incident_desc",
      descriptionValues: { details: String(incident.description || "") },
      time: occurredAt,
      action: incident.status === "OPEN" ? "report" : undefined,
    });
  }

  return alerts.sort((a, b) => b.time - a.time);
};

// ---------------------------------------------------------------------------
// Read / unread — persisted per id so "I have read this" survives reloads.
// ---------------------------------------------------------------------------

const READ_KEY = "connect-ed.driver.alerts.read.v1";

const loadRead = (): Set<string> => {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const saveRead = (ids: Set<string>) => {
  window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
};

export const useDriverAlertReadState = (): {
  read: Set<string>;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
} => {
  const [read, setRead] = React.useState<Set<string>>(loadRead);

  const markRead = React.useCallback((id: string) => {
    setRead((current) => {
      const next = new Set(current);
      next.add(id);
      saveRead(next);
      return next;
    });
  }, []);

  const markAllRead = React.useCallback((ids: string[]) => {
    setRead((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      saveRead(next);
      return next;
    });
  }, []);

  return { read, markRead, markAllRead };
};

export default buildDriverAlerts;