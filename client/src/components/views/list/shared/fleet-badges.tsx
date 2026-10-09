import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

const mapping: Record<string, string> = {
  // Bus / live status
  RUNNING: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  IDLE: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  STOPPED: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  OFFLINE: "bg-slate-500/15 text-slate-500 border-slate-400/30",
  // Trip
  SCHEDULED: "bg-slate-500/15 text-slate-600 border-slate-400/30",
  READY: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  BOARDING: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  IN_PROGRESS: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  DELAYED: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  ARRIVED: "bg-teal-500/15 text-teal-600 border-teal-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  EMERGENCY: "bg-red-500/15 text-red-600 border-red-500/30",
  // Maintenance
  REPORTED: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  APPROVED: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  // Priorities / severity
  LOW: "bg-slate-500/15 text-slate-500 border-slate-400/30",
  MEDIUM: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  HIGH: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  URGENT: "bg-red-500/15 text-red-600 border-red-500/30",
  CRITICAL: "bg-red-500/15 text-red-600 border-red-500/30",
  // Incidents
  OPEN: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  ACKNOWLEDGED: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  INVESTIGATING: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  // Generic
  ACTIVE: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  true: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  false: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  PASS: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  FAIL: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

/** Colored badge derived from a status/priority/severity token. */
export const StatusBadge: React.FC<{
  status?: string | boolean | null;
  label?: string;
}> = ({ status, label }) => {
  const key = status === null || status === undefined ? "" : String(status);
  return (
    <Badge variant='outline' className={mapping[key] ?? mapping.ACTIVE}>
      {label ?? key.replace(/_/g, " ")}
    </Badge>
  );
};

/** Emphasises the tickets that put a bus out of service. */
export const BlockingBadge: React.FC<{ blocking?: boolean | null }> = ({
  blocking,
}) => {
  const { t } = useTranslation();
  return (
    <StatusBadge
      status={Boolean(blocking)}
      label={
        blocking
          ? t("maintenance_form.blocks_badge")
          : t("maintenance_form.non_blocking_badge")
      }
    />
  );
};

/** Friendly date that never renders null. */
export const DateText: React.FC<{ value?: string | Date | null }> = ({ value }) => {
  if (!value) return <span className='text-muted-foreground'>—</span>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span>{String(value)}</span>;
  return (
    <span>
      {date.toLocaleDateString()} {date.getHours()}:{String(date.getMinutes()).padStart(2, "0")}
    </span>
  );
};

/** Money or metric, keeping the original value visible as a fallback. */
export const MoneyText: React.FC<{ value?: number | string | null; prefix?: string }> = ({
  value,
  prefix = "",
}) => {
  if (value === null || value === undefined || value === "") {
    return <span className='text-muted-foreground'>—</span>;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <span>{String(value)}</span>;
  return (
    <span className='tabular-nums'>
      {prefix}
      {numeric.toLocaleString()}
    </span>
  );
};