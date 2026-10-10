import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import StopPicker from "./stop-picker";
import StopsMap from "./stops-map";
import StudentPicker from "./student-picker";
import { nearestStop, parseLocationLink } from "./location";
import type { Rider, RiderFormValues, StopOption, StudentOption } from "./types";

interface RiderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rider: Rider | null;
  stops: StopOption[];
  submitting: boolean;
  onSubmit: (values: RiderFormValues) => void;
}

type StopTarget = "pickup" | "dropoff";

/**
 * Add/edit rider as an animated modal. Riders are existing students (picked by
 * autocomplete); pickup/drop-off stops are type-to-search OR picked from a
 * toggleable map (click = nearest stop), and a shared-location link (Google
 * Maps / geo:) can be pasted and snapped to the nearest stop as well.
 */
const RiderFormDialog: React.FC<RiderFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  rider,
  stops,
  submitting,
  onSubmit,
}) => {
  const { t } = useTranslation();

  const [student, setStudent] = useState<StudentOption | null>(null);
  const [pickupStopId, setPickupStopId] = useState<string | null>(null);
  const [dropoffStopId, setDropoffStopId] = useState<string | null>(null);

  // Map picking / shared-location state.
  const [showMap, setShowMap] = useState(false);
  const [mapTarget, setMapTarget] = useState<StopTarget>("pickup");
  const [sharedLink, setSharedLink] = useState("");
  const [sharedPoint, setSharedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && rider) {
      setStudent({
        id: rider.studentId,
        fullName: rider.fullName,
        profilePhoto: rider.profilePhoto ?? null,
      });
      setPickupStopId(rider.pickupStopId ?? null);
      setDropoffStopId(rider.dropoffStopId ?? null);
    } else {
      setStudent(null);
      setPickupStopId(null);
      setDropoffStopId(null);
    }

    setShowMap(false);
    setMapTarget("pickup");
    setSharedLink("");
    setSharedPoint(null);
  }, [open, mode, rider]);

  const setTargetStop = (target: StopTarget, stopId: string) => {
    if (target === "pickup") setPickupStopId(stopId);
    else setDropoffStopId(stopId);
    // A picked/typed stop supersedes a stale shared-location marker.
    setSharedPoint(null);
  };

  const handleMapPick = (stopId: string) => {
    const stop = stops.find((candidate) => candidate.id === stopId);
    if (!stop) return;

    setTargetStop(mapTarget, stop.id);
    toast({ title: t("rider_management.location_applied", { stopName: stop.name }) });
  };

  const handleSharedLink = () => {
    const parsed = parseLocationLink(sharedLink);
    if (!parsed) {
      toast({
        variant: "destructive",
        title: t("rider_management.invalid_location_link"),
      });
      return;
    }

    setSharedPoint({ latitude: parsed[0], longitude: parsed[1] });
    setShowMap(true);

    const nearest = nearestStop(parsed, stops);
    if (!nearest) {
      toast({
        variant: "destructive",
        title: t("rider_management.no_stop_coords"),
      });
      return;
    }

    setTargetStop(mapTarget, nearest.id);
    toast({
      title: t("rider_management.location_applied", { stopName: nearest.name }),
    });
  };

  const canSubmit = Boolean(student) && !submitting;
  const targetOptions: Array<{ key: StopTarget; label: string }> = [
    { key: "pickup", label: t("rider_management.pickup") },
    { key: "dropoff", label: t("rider_management.dropoff") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? t("rider_management.edit_rider")
              : t("rider_management.add_new_rider")}
          </DialogTitle>
          <DialogDescription>
            {t("rider_management.form_description")}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <Label>{t("rider_management.student")}</Label>
            <StudentPicker
              value={student}
              onChange={setStudent}
              placeholder={t("rider_management.select_student")}
              noResultsLabel={t("rider_management.no_students_found")}
              disabled={submitting}
            />
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label>{t("rider_management.pickup_stop")}</Label>
              <StopPicker
                stops={stops}
                value={pickupStopId}
                accent='pickup'
                onChange={(stopId) => {
                  setPickupStopId(stopId);
                  if (stopId) {
                    setMapTarget("pickup");
                    setSharedPoint(null);
                  }
                }}
                onFocusField={() => setMapTarget("pickup")}
                placeholder={t("rider_management.select_pickup_stop")}
                noResultsLabel={t("rider_management.no_stops_found")}
              />
            </div>

            <div className='space-y-1.5'>
              <Label>{t("rider_management.dropoff_stop")}</Label>
              <StopPicker
                stops={stops}
                value={dropoffStopId}
                accent='dropoff'
                onChange={(stopId) => {
                  setDropoffStopId(stopId);
                  if (stopId) {
                    setMapTarget("dropoff");
                    setSharedPoint(null);
                  }
                }}
                onFocusField={() => setMapTarget("dropoff")}
                placeholder={t("rider_management.select_dropoff_stop")}
                noResultsLabel={t("rider_management.no_stops_found")}
              />
            </div>
          </div>

          {/* Map-based stop picking (toggled on demand). */}
          <div className='space-y-2 rounded-xl border bg-muted/20 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <Label className='text-sm font-semibold'>
                {t("rider_management.route_map")}
              </Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='gap-1.5'
                onClick={() => setShowMap((visible) => !visible)}
              >
                <MapPinned className='h-3.5 w-3.5' />
                {showMap
                  ? t("rider_management.hide_map")
                  : t("rider_management.choose_from_map")}
              </Button>
            </div>

            {showMap ? (
              <>
                <StopsMap
                  stops={stops}
                  pickupStopId={pickupStopId}
                  dropoffStopId={dropoffStopId}
                  emptyLabel={t("rider_management.no_stops")}
                  interactive
                  onPickStop={handleMapPick}
                  sharedPoint={sharedPoint}
                  sharedLabel={t("rider_management.shared_marker")}
                />
                <p className='text-xs text-muted-foreground'>
                  {t("rider_management.map_click_hint")}{" "}
                  <span className='font-semibold text-foreground'>
                    {mapTarget === "pickup"
                      ? t("rider_management.pickup")
                      : t("rider_management.dropoff")}
                  </span>
                </p>
              </>
            ) : null}

            <div className='flex flex-wrap items-center gap-2 pt-1'>
              {/* Which field a map click / shared link should fill. */}
              <div
                className='inline-flex shrink-0 rounded-md border bg-background p-0.5'
                aria-label={t("rider_management.map_target")}
              >
                {targetOptions.map((option) => (
                  <button
                    key={option.key}
                    type='button'
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      mapTarget === option.key
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMapTarget(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className='flex min-w-0 flex-1 items-center gap-2'>
                <Input
                  value={sharedLink}
                  onChange={(event) => setSharedLink(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSharedLink();
                  }}
                  placeholder={t("rider_management.shared_location_placeholder")}
                  className='h-8 min-w-[180px] flex-1 text-sm'
                />
                <Button
                  type='button'
                  variant='secondary'
                  size='sm'
                  className='h-8 shrink-0'
                  onClick={handleSharedLink}
                >
                  {t("rider_management.use_location")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("rider_management.cancel")}
          </Button>
          <Button
            type='button'
            disabled={!canSubmit}
            onClick={() => {
              if (!student) return;
              onSubmit({ studentId: student.id, pickupStopId, dropoffStopId });
            }}
          >
            {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
            {mode === "edit"
              ? t("rider_management.save_changes")
              : t("rider_management.add_rider")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RiderFormDialog;