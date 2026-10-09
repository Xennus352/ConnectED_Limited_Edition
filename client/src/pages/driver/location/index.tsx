import React from "react";
import { useTranslation } from "react-i18next";
import {
  Crosshair,
  MapPin,
  Send,
  Satellite,
} from "lucide-react";

import {
  useFleetBus,
  useFleetRealtime,
  useFleetSnapshot,
} from "@/features/fleet/hooks";
import { useFleetService } from "@/services/fleet";
import { useDriverService } from "@/services/transport";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/views/list/shared/fleet-badges";

const DriverLocationPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { sendLocation } = useFleetService();
  const { getMyBus } = useDriverService();

  const { data: assigned, isLoading: busLoading } = getMyBus;
  const busId = assigned?.id as string | undefined;

  // Realtime wiring: initial role-scoped snapshot + incremental socket events.
  useFleetRealtime();
  useFleetSnapshot();
  const liveBus = useFleetBus(busId);

  const initialLat = assigned?.latitude ?? null;
  const initialLng = assigned?.longitude ?? null;

  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [speed, setSpeed] = React.useState("");
  const [heading, setHeading] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (initialLat !== null && initialLng !== null) {
      setLatitude(String(Number(initialLat).toFixed(6)));
      setLongitude(String(Number(initialLng).toFixed(6)));
    }
  }, [initialLat, initialLng]);

  const useBrowserGps = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: t("driver_location.gps_unavailable"),
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude.toFixed(6)));
        setLongitude(String(position.coords.longitude.toFixed(6)));
        setSpeed(position.coords.speed ? String(position.coords.speed) : "");
        setHeading(position.coords.heading ? String(position.coords.heading) : "");
        toast({ title: t("driver_location.gps_located") });
      },
      () => {
        toast({ variant: "destructive", title: t("driver_location.gps_error") });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleBroadcast = async () => {
    if (!busId) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast({ variant: "destructive", title: t("driver_location.invalid_coords") });
      return;
    }
    setSending(true);
    try {
      await sendLocation(busId, {
        latitude: lat,
        longitude: lng,
        speed: speed ? Number(speed) : undefined,
        heading: heading ? Number(heading) : undefined,
      });
      toast({ title: t("driver_location.broadcast_sent") });
    } catch {
      toast({ variant: "destructive", title: t("transport_form.action_failed") });
    } finally {
      setSending(false);
    }
  };

  if (busLoading) return <Skeleton className='h-64 w-full' />;

  if (!busId) {
    return (
      <div className='flex flex-col items-center gap-3 py-16 text-muted-foreground'>
        <MapPin className='h-10 w-10' />
        <p>{t("driver_location.no_bus")}</p>
      </div>
    );
  }

  const current = liveBus ?? assigned;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-2 flex-wrap'>
        <h2 className='text-2xl font-bold'>{t("driver_location.title")}</h2>
        {current && <StatusBadge status={current.status} />}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
                {t("driver_location.live_position")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <Satellite className='h-4 w-4 text-muted-foreground' />
              <span className='text-2xl font-bold tabular-nums'>
                {current?.latitude !== null && current?.latitude !== undefined
                  ? `${Number(current.latitude).toFixed(5)}, ${Number(
                      current.longitude
                    ).toFixed(5)}`
                  : "—"}
              </span>
            </div>
            <div className='text-sm text-muted-foreground'>
              {t("driver_location.speed")}: {current?.speed ?? 0} · {t("driver_location.heading")}:{" "}
              {current?.heading ?? 0}°
            </div>
            <div className='text-sm text-muted-foreground'>
              {t("driver_location.updated")}:{" "}
              {current?.lastLocationAt
                ? new Date(current.lastLocationAt).toLocaleTimeString()
                : "—"}
            </div>
          </CardContent>
        </Card>

        <Card className='lg:col-span-2'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>
              <span className='inline-flex items-center gap-2'>
                <Send className='h-4 w-4 text-muted-foreground' />
                {t("driver_location.share_title")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label>{t("driver_location.latitude")}</Label>
                <Input
                  type='number'
                  step='any'
                  value={latitude}
                  placeholder='0.000000'
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </div>
              <div>
                <Label>{t("driver_location.longitude")}</Label>
                <Input
                  type='number'
                  step='any'
                  value={longitude}
                  placeholder='0.000000'
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </div>
              <div>
                <Label>{t("driver_location.speed")}</Label>
                <Input
                  type='number'
                  step='any'
                  value={speed}
                  placeholder='km/h'
                  onChange={(event) => setSpeed(event.target.value)}
                />
              </div>
              <div>
                <Label>{t("driver_location.heading")}</Label>
                <Input
                  type='number'
                  step='any'
                  value={heading}
                  placeholder='°'
                  onChange={(event) => setHeading(event.target.value)}
                />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={useBrowserGps}
              >
                <Crosshair className='h-3.5 w-3.5' />
                {t("driver_location.use_gps")}
              </Button>
              <Button
                size='sm'
                className='gap-1'
                onClick={handleBroadcast}
                disabled={sending}
              >
                <Send className='h-3.5 w-3.5' />
                {sending ? t("driver_location.sending") : t("driver_location.broadcast")}
              </Button>
            </div>

            <p className='text-xs text-muted-foreground'>
              {t("driver_location.broadcast_note")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverLocationPage;