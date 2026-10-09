import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** i18n key or plain message. */
  message?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Friendly error state with a "try again" action. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  description,
  onRetry,
  className = "",
}) => {
  const { t } = useTranslation();
  return (
    <div
      role='alert'
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center ${className}`}
    >
      <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
        <AlertTriangle className='h-7 w-7' />
      </div>
      <h3 className='mt-1 text-base font-semibold'>
        {message ?? t("driver_common.something_went_wrong")}
      </h3>
      {description ? (
        <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant='outline' size='sm' className='mt-2 gap-1.5' onClick={onRetry}>
          <RefreshCw className='h-3.5 w-3.5' />
          {t("driver_common.try_again")}
        </Button>
      ) : null}
    </div>
  );
};

export default ErrorState;