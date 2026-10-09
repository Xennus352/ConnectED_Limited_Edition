import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BottomSheetProps {
  /** Always-visible header row (bus + status). */
  header: React.ReactNode;
  /** Expanded content. */
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

const DRAG_THRESHOLD = 48;

/**
 * Mobile map bottom sheet with two states (collapsed / expanded). Dragging
 * the handle or tapping it switches state; the transition uses transform so
 * it stays cheap. Not used on desktop (`lg:hidden`).
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  header,
  children,
  open,
  onOpenChange,
  className = "",
}) => {
  const { t } = useTranslation();
  const [dragStart, setDragStart] = React.useState<number | null>(null);
  const [dragDy, setDragDy] = React.useState(0);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      setDragStart(event.clientY);
    } else if (event.button === 0) {
      setDragStart(event.clientY);
    }
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (dragStart === null) return;
    setDragDy(event.clientY - dragStart);
  };
  const onPointerUp = () => {
    if (dragStart === null) return;
    if (dragDy < -DRAG_THRESHOLD && !open) onOpenChange(true);
    if (dragDy > DRAG_THRESHOLD && open) onOpenChange(false);
    setDragStart(null);
    setDragDy(0);
  };

  return (
    <section
      aria-label={t("driver_map.trip_sheet")}
      className={`absolute inset-x-0 bottom-0 z-[1100] mx-2 mb-2 rounded-2xl border bg-background shadow-2xl lg:hidden ${className}`}
    >
      <button
        type='button'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls='driver-map-sheet-body'
        className='flex w-full touch-none items-center justify-between gap-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-2xl'
      >
        <span className='flex min-w-0 items-center gap-3'>{header}</span>
        <span className='flex shrink-0 flex-col items-center text-muted-foreground'>
          <span className='h-1 w-10 rounded-full bg-muted-foreground/30' />
          {open ? (
            <ChevronDown className='mt-1 h-4 w-4' />
          ) : (
            <ChevronUp className='mt-1 h-4 w-4' />
          )}
          <span className='sr-only'>{t("driver_common.toggle_panel")}</span>
        </span>
      </button>

      <div
        id='driver-map-sheet-body'
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-[55vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className='max-h-[55vh] overflow-y-auto border-t px-4 py-3'>{children}</div>
      </div>
    </section>
  );
};

export default BottomSheet;