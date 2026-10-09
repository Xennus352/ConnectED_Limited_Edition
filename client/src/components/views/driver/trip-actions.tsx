import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Clock, Flag, Play, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/tools";
import type { DriverDataTrip } from "./features";
import { StatusBadge } from "@/components/views/list/shared/fleet-badges";

/** Serialized mutation returned by the driver service. */
export interface DriverTripActions {
  startTrip: {
    isPending: boolean;
    mutateAsync: (input: { tripId: string; body?: object }) => Promise<unknown>;
  };
  completeTrip: {
    isPending: boolean;
    mutateAsync: (input: { tripId: string; body: object }) => Promise<unknown>;
  };
  delayTrip: {
    isPending: boolean;
    mutateAsync: (input: { tripId: string; body: object }) => Promise<unknown>;
  };
}

/** Context used by the completion summary (end-trip confirmation). */
export interface TripCompletionContext {
  stopsCompleted?: number;
  stopsTotal?: number;
  distanceKm?: number | null;
  startedAt?: string | null;
}

interface TripActionsProps {
  trip: DriverDataTrip;
  actions: DriverTripActions;
  /** Real summary values for the end-trip confirmation sheet. */
  completion?: TripCompletionContext;
  /** Large touch-friendly controls (map hero / dashboard). */
  size?: "default" | "lg";
  className?: string;
}

const startable = (trip: DriverDataTrip) =>
  ["SCHEDULED", "READY", "DELAYED"].includes(trip.status);
const delayable = (trip: DriverDataTrip) =>
  ["SCHEDULED", "READY"].includes(trip.status);

/**
 * The complete set of trip lifecycle controls (start / delay / complete) with
 * confirmation dialogs that submit the REAL backend transitions. Busy state,
 * toasts and invalidation are all owned by the mutations.
 */
export const TripActions: React.FC<TripActionsProps> = ({
  trip,
  actions,
  completion,
  size = "default",
  className = "",
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<"start" | "delay" | "complete" | null>(null);

  // Form fields.
  const [odometerStart, setOdometerStart] = React.useState("");
  const [odometerEnd, setOdometerEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [delayMinutes, setDelayMinutes] = React.useState("10");

  const close = () => {
    setMode(null);
    setOdometerStart("");
    setOdometerEnd("");
    setNotes("");
    setDelayMinutes("10");
  };

  const run = async (action: "start" | "delay" | "complete") => {
    if (action === "start") {
      await actions.startTrip.mutateAsync({
        tripId: trip._id,
        body: { odometerStart: odometerStart ? Number(odometerStart) : null },
      });
    } else if (action === "delay") {
      await actions.delayTrip.mutateAsync({
        tripId: trip._id,
        body: {
          delayMinutes: Math.max(1, Number(delayMinutes) || 1),
          notes,
        },
      });
    } else {
      await actions.completeTrip.mutateAsync({
        tripId: trip._id,
        body: {
          odometerEnd: odometerEnd ? Number(odometerEnd) : null,
          notes,
        },
      });
    }
    close();
  };

  const lg = size === "lg";
  const pending =
    (mode === "start" && actions.startTrip.isPending) ||
    (mode === "delay" && actions.delayTrip.isPending) ||
    (mode === "complete" && actions.completeTrip.isPending);

  if (trip.status === "COMPLETED") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
        <CheckCircle2 className='h-4 w-4 text-emerald-500' />
        {completion?.distanceKm != null
          ? `${t("driver_common.distance")}: ${completion.distanceKm.toFixed(1)} km`
          : t("driver_trips.completed")}
      </span>
    );
  }
  if (trip.status === "CANCELLED") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
        <XCircle className='h-4 w-4 text-muted-foreground' />
        {t("driver_common.cancelled")}
      </span>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {startable(trip) ? (
          <Button
            size={lg ? "lg" : "default"}
            className='gap-1.5'
            onClick={() => setMode("start")}
            disabled={actions.startTrip.isPending}
          >
            {actions.startTrip.isPending ? (
              <LoadingSpinner />
            ) : (
              <Play className='h-4 w-4' />
            )}
            {t("driver_trips.start")}
          </Button>
        ) : null}

        {delayable(trip) ? (
          <Button
            size={lg ? "lg" : "default"}
            variant='secondary'
            className='gap-1.5'
            onClick={() => setMode("delay")}
            disabled={actions.delayTrip.isPending}
          >
            <Clock className='h-4 w-4' />
            {t("driver_trips.delay")}
          </Button>
        ) : null}

        {trip.status === "IN_PROGRESS" ? (
          <Button
            size={lg ? "lg" : "default"}
            variant={lg ? "default" : "default"}
            className='gap-1.5 bg-red-600 hover:bg-red-700 text-white'
            onClick={() => setMode("complete")}
            disabled={actions.completeTrip.isPending}
          >
            {actions.completeTrip.isPending ? (
              <LoadingSpinner />
            ) : (
              <Flag className='h-4 w-4' />
            )}
            {t("driver_trips.complete")}
          </Button>
        ) : null}
      </div>

      {/* START */}
      <Dialog open={mode === "start"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Play className='h-4 w-4 text-primary' />
              {t("driver_trips.start_trip")}
            </DialogTitle>
            <DialogDescription>{t("driver_trips.start_description")}</DialogDescription>
          </DialogHeader>
          <div className='flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm'>
            <StatusBadge status={trip.status} />
            <span className='font-semibold'>{trip.route?.name || "—"}</span>
          </div>
          <div>
            <Label htmlFor='driver-trip-odometer-start'>{t("driver_trips.odometer_start")}</Label>
            <Input
              id='driver-trip-odometer-start'
              type='number'
              inputMode='decimal'
              value={odometerStart}
              placeholder='0'
              onChange={(event) => setOdometerStart(event.target.value)}
              className='mt-1.5'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={close}>
              {t("button.cancel")}
            </Button>
            <Button onClick={() => void run("start")} disabled={pending}>
              {pending ? <LoadingSpinner /> : <Play className='h-4 w-4' />}
              {t("driver_trips.confirm_start")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELAY */}
      <Dialog open={mode === "delay"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Clock className='h-4 w-4 text-amber-500' />
              {t("driver_trips.delay_trip")}
            </DialogTitle>
            <DialogDescription>{t("driver_trips.delay_description")}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor='driver-trip-delay-minutes'>{t("driver_trips.delay_minutes")}</Label>
            <Input
              id='driver-trip-delay-minutes'
              type='number'
              inputMode='numeric'
              value={delayMinutes}
              placeholder='10'
              onChange={(event) => setDelayMinutes(event.target.value)}
              className='mt-1.5'
            />
          </div>
          <div>
            <Label htmlFor='driver-trip-delay-notes'>{t("driver_trips.notes")}</Label>
            <Input
              id='driver-trip-delay-notes'
              value={notes}
              placeholder={t("driver_trips.delay_notes_placeholder")}
              onChange={(event) => setNotes(event.target.value)}
              className='mt-1.5'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={close}>
              {t("button.cancel")}
            </Button>
            <Button onClick={() => void run("delay")} disabled={pending}>
              {pending ? <LoadingSpinner /> : <Clock className='h-4 w-4' />}
              {t("driver_trips.confirm_delay")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPLETE */}
      <Dialog open={mode === "complete"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Flag className='h-4 w-4 text-red-500' />
              {t("driver_trips.complete_trip")}
            </DialogTitle>
            <DialogDescription>{t("driver_trips.complete_description")}</DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-3 gap-2'>
            <SummaryCell
              label={t("driver_common.duration")}
              value={formatDuration(completion?.startedAt ?? null)}
              icon={<Clock className='h-3.5 w-3.5' />}
            />
            <SummaryCell
              label={t("driver_common.stops")}
              value={
                completion && completion.stopsTotal
                  ? `${completion.stopsCompleted ?? 0} / ${completion.stopsTotal}`
                  : "—"
              }
              icon={<CheckCircle2 className='h-3.5 w-3.5' />}
            />
            <SummaryCell
              label={t("driver_common.distance")}
              value={
                completion?.distanceKm != null
                  ? `${completion.distanceKm.toFixed(1)} km`
                  : "—"
              }
              icon={<AlertTriangle className='h-3.5 w-3.5' />}
            />
          </div>

          <div>
            <Label htmlFor='driver-trip-odometer-end'>{t("driver_trips.odometer_end")}</Label>
            <Input
              id='driver-trip-odometer-end'
              type='number'
              inputMode='decimal'
              value={odometerEnd}
              placeholder='0'
              onChange={(event) => setOdometerEnd(event.target.value)}
              className='mt-1.5'
            />
          </div>
          <div>
            <Label htmlFor='driver-trip-complete-notes'>{t("driver_trips.notes")}</Label>
            <Input
              id='driver-trip-complete-notes'
              value={notes}
              placeholder={t("driver_trips.enter_notes")}
              onChange={(event) => setNotes(event.target.value)}
              className='mt-1.5'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={close}>
              {t("button.cancel")}
            </Button>
            <Button
              className='bg-red-600 text-white hover:bg-red-700'
              onClick={() => void run("complete")}
              disabled={pending}
            >
              {pending ? <LoadingSpinner /> : <Flag className='h-4 w-4' />}
              {t("driver_trips.confirm_complete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SummaryCell: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className='rounded-lg border bg-muted/40 px-3 py-2'>
    <div className='flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
      {icon}
      {label}
    </div>
    <div className='mt-0.5 truncate text-sm font-bold tabular-nums'>{value}</div>
  </div>
);

const formatDuration = (startedAt: string | null): string => {
  if (!startedAt) return "—";
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - start) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export default TripActions;