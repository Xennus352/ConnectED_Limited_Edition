import React from "react";
import { useTranslation } from "react-i18next";
import {
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Send,
} from "lucide-react";

import { useDriverWorkspace } from "@/components/views/driver/features";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import GpsStatus from "@/components/views/driver/gps-status";
import { TripActions } from "@/components/views/driver/trip-actions";
import { TripProgress } from "@/components/views/driver/trip-progress";
import { BottomSheet } from "@/components/views/driver/bottom-sheet";
import EmptyStateCmp from "@/components/views/driver/empty-state";
import { MapPageSkeleton } from "@/components/views/driver/skeletons";
import { IncidentReportDialog } from "@/components/views/driver/incident-report";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDriverSettings } from "@/hooks/useDriverSettings";
import { useFleetService } from "@/services/fleet";
import FleetMap from "@/features/fleet/components/FleetMap";
import { formatAge, ageOf } from "@/features/fleet/freshness";

const DriverMapPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings, update } = useDriverSettings();
  const { sendLocation } = useFleetService();

  const workspace = useDriverWorkspace();
  const bus = workspace.assigned;
  const focusTrip = workspace.currentTrip ?? workspace.nextTrip;

  const [sheetOpen, setSheetOpen] = React.useState(true);
  const [focusNonce, setFocusNonce] = React.useState(0);
  const [incidentOpen, setIncidentOpen] = React.useState(false);

  // Stable props for the map: the leaflet controller must not receive a new
  // object identity on every unrelated render — that would re-trigger the
  // flyTo/panTo follow animation on each realtime tick (visible flashing).
  const available = React.useMemo(() => (bus ? [bus] : []), [bus]);
  const focus = React.useMemo(
    () => ({ busId: bus?.id ?? "", nonce: focusNonce }),
    [bus?.id, focusNonce]
  );
  const following = settings.followMeOnMap && Boolean(bus?.id);

  // Optional live GPS broadcast (browser watchPosition → server endpoint).
  const broadcastRef = React.useRef<number | null>(null);
  const lastSentRef = React.useRef(0);

  const stopBroadcast = React.useCallback(() => {
    if (broadcastRef.current !== null) {
      navigator.geolocation.clearWatch(broadcastRef.current);
      broadcastRef.current = null;
    }
  }, []);

  const startBroadcast = React.useCallback(() => {
    if (!navigator.geolocation || !bus?.id) {
      toast({ variant: "destructive", title: t("driver_location.gps_unavailable") });
      update({ autoBroadcast: false });
      return;
    }
    broadcastRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        // Send at most one fix every 5 seconds to keep the API light.
        if (Date.now() - lastSentRef.current < 5000) return;
        lastSentRef.current = Date.now();
        try {
          await sendLocation(bus.id, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed ?? undefined,
            heading: position.coords.heading ?? undefined,
          });
        } catch {
          toast({ variant: "destructive", title: t("transport_form.action_failed") });
        }
      },
      () => {
        toast({ variant: "destructive", title: t("driver_location.gps_error") });
        update({ autoBroadcast: false });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [bus?.id, sendLocation, toast, t, update]);

  React.useEffect(() => {
    if (settings.autoBroadcast) startBroadcast();
    else stopBroadcast();
    return stopBroadcast;
  }, [settings.autoBroadcast, startBroadcast, stopBroadcast]);

  const gpsStatus = bus ? workspace.freshness : "OFFLINE";

  if (workspace.loadingBus) return <MapPageSkeleton />;

  if (!bus) {
    return (
      <div className='flex h-full flex-col gap-4'>
        <EmptyStateCmp
          icon={<MapPin className='h-7 w-7' />}
          title={t("driver_map.no_bus")}
          description={t("driver_map.no_bus_desc")}
        />
      </div>
    );
  }

  const panelContent = (
    <div className='flex flex-col gap-3'>
      {/* Live trip summary */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2.5'>
          <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl'>
            🚌
          </span>
          <div>
            <div className='text-base font-bold leading-tight'>{bus.busNumber}</div>
            <LiveStatusBadge status={gpsStatus} size='sm' />
          </div>
        </div>
        <div className='text-right'>
          <div className='text-lg font-bold tabular-nums'>{Math.round(bus.speed)}</div>
          <div className='text-[11px] uppercase tracking-wide text-muted-foreground'>km/h</div>
        </div>
      </div>

      {focusTrip ? (
        <>
          <div className='rounded-xl border bg-muted/40 px-3 py-2 text-sm'>
            <span className='font-semibold'>{focusTrip.route?.name || "—"}</span>
            <span className='text-muted-foreground'>
              {" "}
              · {focusTrip.route?.startLocation} → {focusTrip.route?.endLocation}
            </span>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <MiniBox
              label={t("driver_map.next_stop")}
              value={workspace.geo?.nextStop?.name ?? "—"}
              icon={<Navigation className='h-3.5 w-3.5' />}
            />
            <MiniBox
              label={t("driver_map.eta")}
              value={
                workspace.geo?.etaMinutes != null
                  ? t("driver_map.eta_minutes", { minutes: workspace.geo.etaMinutes })
                  : "—"
              }
              icon={<LocateFixed className='h-3.5 w-3.5' />}
            />
          </div>

          <TripProgress
            stops={(bus.route?.stops ?? []).map((stop: any, index: number) => ({
              id: stop.id,
              name: stop.name,
              state: !workspace.geo
                ? "upcoming"
                : index < (workspace.geo.currentIndex ?? 0)
                  ? "completed"
                  : index === (workspace.geo.currentIndex ?? 0)
                    ? "current"
                    : "upcoming",
            }))}
            fraction={workspace.geo?.fraction ?? 0}
            active={workspace.currentTrip?.status === "IN_PROGRESS"}
          />

          <TripActions
            trip={focusTrip}
            actions={workspace.actions}
            completion={{
              stopsCompleted: (workspace.geo?.currentIndex ?? 0) + 1,
              stopsTotal: (bus.route?.stops ?? []).length || undefined,
              distanceKm: workspace.geo?.travelledKm ?? focusTrip.distanceKm ?? null,
              startedAt: workspace.currentTrip?.actualStartAt ?? null,
            }}
            size='lg'
          />
        </>
      ) : (
        <p className='rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground'>
          {t("driver_map.no_active_trip")}
        </p>
      )}

      {/* GPS broadcast + manual report */}
      <div className='grid grid-cols-2 gap-2'>
        <Button
          variant={settings.autoBroadcast ? "default" : "outline"}
          size='sm'
          className='gap-1.5'
          onClick={() => update({ autoBroadcast: !settings.autoBroadcast })}
        >
          <Radio className='h-4 w-4' />
          {settings.autoBroadcast ? t("driver_map.broadcasting") : t("driver_map.broadcast_gps")}
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='gap-1.5'
          onClick={() => setIncidentOpen(true)}
        >
          <Send className='h-4 w-4' />
          {t("driver_map.report_incident")}
        </Button>
      </div>

      <GpsStatus
        bus={bus}
        status={gpsStatus}
        clockOffset={0}
        compact={false}
      />
    </div>
  );

  return (
    <div className='relative flex h-[calc(100dvh-6.5rem)] min-h-[520px] flex-col gap-0 lg:h-[calc(100dvh-7.5rem)]'>
      {/* Desktop header above the map */}
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("driver_map.title")}
          </h1>
          <LiveStatusBadge status={gpsStatus} size='sm' />
        </div>
        <div className='flex items-center gap-2'>
          <span className='hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground sm:flex'>
            <Crosshair className='h-3.5 w-3.5' />
            {bus.lastLocationAt
              ? `${t("driver_common.last_update")} ${formatAge(ageOf(bus.lastLocationAt))}`
              : t("driver_common.no_fix_yet")}
          </span>
          <Button
            variant={following ? "default" : "outline"}
            size='sm'
            className='gap-1.5'
            aria-pressed={following}
            onClick={() => update({ followMeOnMap: !settings.followMeOnMap })}
          >
            <LocateFixed className='h-4 w-4' />
            {t("driver_map.follow_me")}
          </Button>
        </div>
      </div>

      <div className='relative grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
        {/* Map */}
        {bus ? (
          <div className='relative h-[58vh] min-h-[420px] lg:h-auto'>
            <FleetMap
              buses={available}
              selectedBusId={bus.id}
              focus={focus}
              onSelect={() => setFocusNonce((nonce) => nonce + 1)}
              followBusId={following ? bus.id : null}
              onFollowInterrupted={() => update({ followMeOnMap: false })}
              className='h-full'
            />
            {settings.autoBroadcast ? (
              <span className='absolute left-3 top-3 z-[1001] inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow'>
                <span className='h-1.5 w-1.5 rounded-full bg-white driver-pulse-live' />
                {t("driver_map.broadcasting")}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Desktop side panel */}
        {!isMobile ? (
          <aside className='hidden max-h-full overflow-y-auto rounded-2xl border bg-card p-4 shadow-sm lg:block'>
            {panelContent}
          </aside>
        ) : null}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile ? (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          header={
            <>
              <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-base'>
                🚌
              </span>
              <span className='min-w-0'>
                <span className='block text-sm font-bold'>{bus.busNumber}</span>
                <span className='block text-xs text-muted-foreground'>
                  {focusTrip?.route?.name || bus.route?.name || ""}
                </span>
              </span>
            </>
          }
        >
          {panelContent}
        </BottomSheet>
      ) : null}

      <IncidentReportDialog
        open={incidentOpen}
        onOpenChange={setIncidentOpen}
        reportIncident={workspace.actions.reportIncident}
      />
    </div>
  );
};

const MiniBox: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className='rounded-xl border bg-muted/40 px-3 py-2'>
    <div className='flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
      {icon}
      {label}
    </div>
    <div className='mt-0.5 truncate text-sm font-semibold'>{value}</div>
  </div>
);

export default DriverMapPage;