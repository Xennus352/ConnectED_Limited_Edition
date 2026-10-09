import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned actions (refresh, report, ...). */
  actions?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

/**
 * Consistent section header for every driver screen — readable title,
 * muted subtitle and action slot. Keeps operational pages on the same grid.
 */
export const DriverPageHeader: React.FC<DriverPageHeaderProps> = ({
  title,
  subtitle,
  actions,
  loading = false,
  className = "",
}) => (
  <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
    <div className='min-w-0'>
      {loading ? (
        <Skeleton className='h-7 w-44' />
      ) : (
        <h1 className='text-xl font-bold tracking-tight md:text-2xl'>{title}</h1>
      )}
      {subtitle ? (
        <p className='mt-0.5 text-sm text-muted-foreground'>{subtitle}</p>
      ) : null}
    </div>
    {actions ? <div className='flex flex-wrap items-center gap-2'>{actions}</div> : null}
  </div>
);

export default DriverPageHeader;