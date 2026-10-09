/**
 * Floating map controls: the follow toggle required by the spec.
 *
 * `[ Follow Bus ]` → following → a manual pan drops it and the control turns
 * into `[ Resume Following ]`, which restores the previous target.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { Crosshair, LocateFixed, Pause } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FollowControlProps {
  /** Label of the vehicle currently selected, if any. */
  selectedLabel: string | null;
  /** Vehicle being followed right now. */
  followBusId: string | null;
  /** Set when following was interrupted by a manual pan. */
  interrupted: boolean;
  /** Whether a follow target exists (selected vehicle with a fix). */
  canFollow: boolean;
  onFollow: () => void;
  onResume: () => void;
  onStop: () => void;
}

const FollowControl: React.FC<FollowControlProps> = ({
  selectedLabel,
  followBusId,
  interrupted,
  canFollow,
  onFollow,
  onResume,
  onStop,
}) => {
  const { t } = useTranslation();

  return (
    <div className='absolute right-3 top-3 z-[450] flex flex-col items-end gap-1.5'>
      {followBusId ? (
        <Button
          type='button'
          size='sm'
          onClick={onStop}
          className='h-8 gap-1.5 px-2.5 text-xs shadow-md'
          aria-pressed='true'
        >
          <Pause className='size-3.5' aria-hidden='true' />
          {t("fleet.action.stop_following")}
        </Button>
      ) : interrupted ? (
        <Button
          type='button'
          size='sm'
          onClick={onResume}
          className='h-8 gap-1.5 px-2.5 text-xs shadow-md'
        >
          <LocateFixed className='size-3.5' aria-hidden='true' />
          {t("fleet.action.resume_following")}
        </Button>
      ) : (
        <Button
          type='button'
          size='sm'
          variant='secondary'
          disabled={!canFollow}
          onClick={onFollow}
          className='h-8 gap-1.5 px-2.5 text-xs shadow-md'
        >
          <Crosshair className='size-3.5' aria-hidden='true' />
          {selectedLabel
            ? t("fleet.action.follow_bus", { bus: selectedLabel })
            : t("fleet.action.follow_bus_generic")}
        </Button>
      )}
    </div>
  );
};

export default FollowControl;
