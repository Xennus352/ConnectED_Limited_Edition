import React, { useEffect, useState } from "react";
import { BusFront, MapPin, Navigation, Route as RouteIcon, UsersRound } from "lucide-react";

import { Section } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useFleetSnapshot, useFleetRealtime, useFleetBuses, useConnection } from "@/features/fleet/hooks";
import { formatUpdatedTime } from "@/features/fleet/freshness";
import FleetMap from "@/features/fleet/components/FleetMap";
import ConnectionBadge from "@/features/fleet/components/ConnectionBadge";
import type { FleetBus, MapFocus } from "@/features/fleet/types";

const ParentBusTrackingPage: React.FC = () => {
  const { isLoading, isError, reload } = useFleetSnapshot();
  useFleetRealtime();
  const buses = useFleetBuses();
  const { lastDataAge } = useConnection();
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  useEffect(() => {
    if (buses.length && !buses.some((bus) => bus.id === selectedBusId)) {
      setSelectedBusId(buses[0].id);
    }
    if (!buses.length) setSelectedBusId(null);
  }, [buses, selectedBusId]);

  const selectedBus = buses.find((bus) => bus.id === selectedBusId) ?? null;
  const hasLocation = buses.some((bus) => bus.latitude !== null && bus.longitude !== null);
  const selectBus = (busId: string) => {
    setSelectedBusId(busId);
    setFocus({ busId, nonce: Date.now() });
  };
  const mapOverlay = isLoading ? (
    <MapMessage title="Loading your children’s buses" detail="Connecting to the live fleet…" />
  ) : isError ? (
    <MapMessage title="Bus locations could not be loaded" detail="Check your connection and try again." action={reload} />
  ) : buses.length === 0 ? (
    <MapMessage title="No buses linked yet" detail="A bus will appear here when one is assigned to your child." />
  ) : !hasLocation ? (
    <MapMessage title="Waiting for the first GPS update" detail="The map is ready. The bus marker will appear as soon as the driver shares a location." />
  ) : null;

  return (
    <Section id="parent-bus-tracking" title="Live bus tracking">
      <div className="space-y-5 p-3 sm:p-5">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><BusFront size={22} /></div>
            <div><h2 className="font-semibold">Your children’s bus map</h2><p className="mt-1 text-sm text-muted-foreground">Live location and route information for buses assigned to your children.</p></div>
          </div>
          <ConnectionBadge />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Summary icon={<BusFront size={18} />} label="Assigned buses" value={String(buses.length)} />
          <Summary icon={<Navigation size={18} />} label="Currently moving" value={String(buses.filter((bus) => bus.status === "RUNNING").length)} />
          <Summary icon={<MapPin size={18} />} label="Last fleet update" value={lastDataAge === null ? "No updates yet" : formatUpdatedTime(lastDataAge)} />
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
            <FleetMap
              buses={buses}
              selectedBusId={selectedBusId}
              focus={focus}
              onSelect={selectBus}
              className="isolate h-[52vh] min-h-[360px] rounded-none border-0 sm:h-[64vh] sm:min-h-[480px]"
              overlay={mapOverlay}
            />
          </div>

          <aside className="space-y-4">
            <Card className="p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Assigned buses</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{buses.length}</span></div>
              {buses.length ? <div className="space-y-2">{buses.map((bus) => <BusChoice key={bus.id} bus={bus} selected={bus.id === selectedBusId} onClick={() => selectBus(bus.id)} />)}</div> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No bus assignments were found for your children.</p>}
            </Card>

            {selectedBus && <Card className="parent-enter p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected bus</p><h3 className="mt-1 font-semibold">{selectedBus.name || `Bus ${selectedBus.busNumber}`}</h3><p className="text-sm text-muted-foreground">{selectedBus.busNumber} · {selectedBus.registrationNumber}</p></div><StatusPill status={selectedBus.status} /></div>
              <div className="mt-4 space-y-3 text-sm">
                <InfoRow icon={<RouteIcon size={16} />} label="Route" value={selectedBus.route?.name ?? "Route not assigned"} />
                <InfoRow icon={<UsersRound size={16} />} label="Your children on this bus" value={selectedBus.students.map((student) => student.fullName).join(", ") || "No active rider details"} />
                <InfoRow icon={<Navigation size={16} />} label="Speed" value={`${Math.round(selectedBus.speed)} km/h`} />
                <InfoRow icon={<MapPin size={16} />} label="Last location" value={selectedBus.lastLocationAt ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }).format(new Date(selectedBus.lastLocationAt)) : "Waiting for GPS"} />
              </div>
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{lastDataAge === null ? "Waiting for live map updates." : `Map refreshed ${formatUpdatedTime(lastDataAge)}.`} Vehicle movement updates live while connected.</p>
            </Card>}
          </aside>
        </div>
      </div>
    </Section>
  );
};

const Summary = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card className="flex items-center gap-3 p-4 shadow-sm"><span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-semibold">{value}</p></div></Card>
);

const BusChoice = ({ bus, selected, onClick }: { bus: FleetBus; selected: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition hover:border-primary/50 hover:bg-primary/[0.04] ${selected ? "border-primary bg-primary/[0.06]" : "bg-background"}`}>
    <div className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{bus.name || `Bus ${bus.busNumber}`}</span><span className="block truncate text-xs text-muted-foreground">{bus.route?.name ?? "Route not assigned"}</span></span><StatusPill status={bus.status} /></div>
  </button>
);

const StatusPill = ({ status }: { status: string }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === "RUNNING" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{status.toLowerCase().replace(/_/g, " ")}</span>
);

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2.5"><span className="mt-0.5 text-muted-foreground">{icon}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="break-words font-medium">{value}</p></div></div>
);

const MapMessage = ({ title, detail, action }: { title: string; detail: string; action?: () => void }) => (
  <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/50 p-4 backdrop-blur-[2px]">
    <div className="max-w-sm rounded-2xl border bg-card/95 p-5 text-center shadow-xl"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><BusFront size={21} /></div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p>{action && <button type="button" onClick={action} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">Try again</button>}</div>
  </div>
);

export default ParentBusTrackingPage;
