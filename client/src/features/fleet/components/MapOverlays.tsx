/**
 * Overlays that sit on top of the tiles: the loading state, the honest empty
 * state, permission/snapshot errors and the "connection lost" banner.
 *
 * Copy is always a translated, non-technical string — raw backend errors
 * never reach the screen.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { MapPinned, TriangleAlert, WifiOff } from "lucide-react";

import LoadingSpinner from "@/tools/spinner";
import { Button } from "@/components/ui/button";

interface OverlayProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "danger";
}

/** Centred, translucent layer used while loading / empty / failed. */
export const MapOverlay: React.FC<OverlayProps> = ({
  title,
  description,
  action,
  tone = "neutral",
}) => {
  const Icon = tone === "danger" ? TriangleAlert : MapPinned;

  return (
    <div className='absolute inset-0 z-[400] grid place-items-center bg-background/70 backdrop-blur-[1px]'>
      <div className='mx-6 flex max-w-sm flex-col items-center gap-2 rounded-xl border bg-card px-6 py-5 text-center shadow-lg'>
        {tone === "neutral" && !action ? (
          <LoadingSpinner className='text-primary' size='md' />
        ) : (
          <Icon
            className={`size-7 ${tone === "danger" ? "text-destructive" : "text-muted-foreground"}`}
            aria-hidden='true'
          />
        )}
        <p className='text-sm font-semibold'>{title}</p>
        {description ? (
          <p className='text-xs text-muted-foreground'>{description}</p>
        ) : null}
        {action}
      </div>
    </div>
  );
};

/** Full-width warning strip: the socket dropped but tiles are still shown. */
export const ConnectionLostBanner: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className='absolute inset-x-0 top-0 z-[450] flex justify-center px-3 pt-3'>
      <div className='flex items-center gap-2 rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-md dark:border-red-900/60 dark:bg-red-950/80 dark:text-red-300'>
        <WifiOff className='size-4 shrink-0' aria-hidden='true' />
        {t("fleet.connection.lost")}
        {onRetry ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={onRetry}
            className='h-6 px-2 text-[11px]'
          >
            {t("fleet.action.retry")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default MapOverlay;
