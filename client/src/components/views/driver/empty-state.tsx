import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Friendly empty state for driver pages — icon + explanation + action. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center ${className}`}
  >
    {icon ? (
      <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-primary shadow-sm'>
        {icon}
      </div>
    ) : null}
    <h3 className='mt-1 text-base font-semibold'>{title}</h3>
    {description ? (
      <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
    ) : null}
    {action ? <div className='mt-2'>{action}</div> : null}
  </div>
);

export default EmptyState;