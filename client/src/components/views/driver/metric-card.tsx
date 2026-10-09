import React from "react";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Small supporting line under the value. */
  hint?: React.ReactNode;
  /** Icon chip colour family (defaults to primary). */
  tone?: "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const TONES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

/** Small operational stat used sparingly on the driver dashboard. */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  hint,
  tone = "primary",
  className = "",
}) => (
  <div
    className={`rounded-xl border bg-card p-3.5 shadow-sm ${className}`}
  >
    <div className='flex items-center gap-3'>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        {icon}
      </span>
      <div className='min-w-0'>
        <div className='truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
          {label}
        </div>
        <div className='text-lg font-bold leading-tight tabular-nums'>{value}</div>
      </div>
    </div>
    {hint ? <div className='mt-1.5 text-xs text-muted-foreground'>{hint}</div> : null}
  </div>
);

export default MetricCard;