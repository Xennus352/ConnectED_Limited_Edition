import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusFront, CircleAlert, MapPin, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import useAxiosInstance from "@/api";
import { Card, CardTitle } from "@/components/ui/card";
import { getActiveSocket } from "@/lib/socket";
import { classifyFreshness } from "@/features/fleet/freshness";

type Stop = { id: string; name: string; latitude: number; longitude: number; sequence: number };
type Transport = {
  assignment: { pickupStop: Stop | null; dropoffStop: Stop | null };
  bus: { id: string; busNumber: string; registrationNumber: string; status: string; latitude: number | null; longitude: number | null; speed: number; lastLocationAt: string | null; route: { name: string; stops: Stop[] } | null; driver: { fullName: string; profilePhoto?: string | null } | null };
  trip: { status: string; scheduledStartAt?: string | null; actualStartAt?: string | null } | null;
  boarding: { eventType: string; occurredAt: string; stopId?: string | null } | null;
};

const valid = (lat?: number | null, lng?: number | null): lat is number => Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
const busGlyph = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 34" width="50" height="28" aria-hidden="true"><rect x="2" y="8" width="56" height="18" rx="7" fill="#2563eb" stroke="white" stroke-width="1.5"/><path d="M14 8 13 3h32l1 5z" fill="#2563eb" stroke="white" stroke-width="1.2"/><rect x="7" y="10" width="9" height="6" rx="2" fill="white" fill-opacity=".7"/><rect x="19" y="10" width="9" height="6" rx="2" fill="white" fill-opacity=".7"/><rect x="31" y="10" width="9" height="6" rx="2" fill="white" fill-opacity=".7"/><path d="M42 9h11a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H42z" fill="white"/><circle cx="14" cy="25" r="5.5" fill="#1e293b"/><circle cx="46" cy="25" r="5.5" fill="#1e293b"/></svg>';
const busIcon = L.divIcon({ className: "fleet-bus-divicon", html: `<div class="fleet-bus-marker">${busGlyph}</div>`, iconSize: [56, 46], iconAnchor: [28, 23], popupAnchor: [0, -18] });

const Recenter = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, Math.max(map.getZoom(), 13), { animate: true }); }, [position, map]);
  return null;
};

const StudentTransportPage = () => {
  const axios = useAxiosInstance();
  const query = useQuery({
    queryKey: ["student", "transport"],
    queryFn: async () => (await axios.get("/student/transport")).data,
    staleTime: 20_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const payload = query.data;
  const transport = payload?.data as Transport | null | undefined;
  const meta = payload?.meta;
  const [livePosition, setLivePosition] = useState<[number, number] | null>(null);
  const [liveAt, setLiveAt] = useState<string | null>(null);
  const [connected, setConnected] = useState(Boolean(getActiveSocket()?.connected));
  const [clock, setClock] = useState(Date.now());
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!transport?.bus?.id) return;
    const socket = getActiveSocket();
    if (!socket) { setConnected(false); return; }
    const onLocation = (event: { busId: string; latitude: number; longitude: number; timestamp: string }) => {
      if (event.busId !== transport.bus.id || !valid(event.latitude, event.longitude)) return;
      setLivePosition([event.latitude, event.longitude]);
      setLiveAt(event.timestamp);
    };
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("bus:location", onLocation);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);
    return () => { socket.off("bus:location", onLocation); socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); };
  }, [transport?.bus?.id]);

  const busPosition = useMemo<[number, number] | null>(() => livePosition ?? (transport && valid(transport.bus.latitude, transport.bus.longitude) ? [transport.bus.latitude!, transport.bus.longitude!] : null), [livePosition, transport]);
  const locationAt = liveAt ?? transport?.bus.lastLocationAt ?? null;
  const clockOffset = meta?.serverTime ? Date.parse(meta.serverTime) - clock : 0;
  const freshness = classifyFreshness({ lastLocationAt: locationAt, meta: meta ?? null, clockOffset });
  const stops = transport?.bus.route?.stops?.filter((stop) => valid(stop.latitude, stop.longitude)).sort((a, b) => a.sequence - b.sequence) ?? [];
  const center = busPosition ?? (stops[0] ? [stops[0].latitude, stops[0].longitude] as [number, number] : meta?.map?.center ?? [18.94, 96.43]);
  const routeLine = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  const lastUpdatedLabel = locationAt ? new Date(locationAt).toLocaleString() : "No GPS location has been reported";

  if (query.isLoading) return <div className="space-y-4"><div className="h-10 w-64 animate-pulse rounded bg-muted"/><div className="h-[55vh] animate-pulse rounded-xl bg-muted"/></div>;
  if (query.isError) return <Card className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"><CircleAlert className="h-8 w-8 text-destructive"/><CardTitle>Transport information is unavailable</CardTitle><p className="text-sm text-muted-foreground">Please try again. Your transport assignment has not been changed.</p><button onClick={() => void query.refetch()} className="inline-flex items-center gap-2 rounded-md border px-4 py-2"><RefreshCw className="h-4 w-4"/>Retry</button></Card>;
  if (!transport) return <Card className="mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center gap-3 p-8 text-center"><MapPin className="h-9 w-9 text-primary"/><CardTitle>No bus assignment found</CardTitle><p className="max-w-md text-sm text-muted-foreground">There is no active bus assignment on your student record. Contact your school office if you believe this is incorrect.</p></Card>;

  return <main className="space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-muted-foreground">My Transport</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{transport.bus.route?.name ?? "Bus tracking"}</h1></div><button onClick={() => void query.refetch()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/>Refresh</button></header>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-xl border bg-muted sm:h-[65vh]" aria-label="Bus route map">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer url={meta?.map?.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} attribution={meta?.map?.tileAttribution ?? "© OpenStreetMap contributors"}/>
          <Recenter position={busPosition}/>
          {stops.map((stop) => <CircleMarker key={stop.id} center={[stop.latitude, stop.longitude]} radius={selectedStopId === stop.id ? 8 : 6} pathOptions={{ color: selectedStopId === stop.id ? "#f59e0b" : "#2563eb", fillOpacity: 1 }} eventHandlers={{ click: () => setSelectedStopId(stop.id) }}><Popup><strong>{stop.sequence}. {stop.name}</strong></Popup></CircleMarker>)}
          {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.75 }}/>}
          {busPosition && <Marker position={busPosition} icon={busIcon} title={`Bus ${transport.bus.busNumber}`}><Popup><strong>Bus {transport.bus.busNumber}</strong><br/>Last update: {lastUpdatedLabel}</Popup></Marker>}
          {transport.assignment.pickupStop && valid(transport.assignment.pickupStop.latitude, transport.assignment.pickupStop.longitude) && <Marker position={[transport.assignment.pickupStop.latitude, transport.assignment.pickupStop.longitude]} title={`Pickup: ${transport.assignment.pickupStop.name}`}/>}
          {transport.assignment.dropoffStop && valid(transport.assignment.dropoffStop.latitude, transport.assignment.dropoffStop.longitude) && <Marker position={[transport.assignment.dropoffStop.latitude, transport.assignment.dropoffStop.longitude]} title={`Drop-off: ${transport.assignment.dropoffStop.name}`}/>}
        </MapContainer>
        {!busPosition && <div className="absolute inset-x-4 top-4 z-[1000] rounded-lg border bg-background/95 p-3 text-sm shadow">Bus GPS location is unavailable. The map shows only route stops with saved coordinates.</div>}
      </section>
      <aside className="space-y-4">
        <Card className="p-4"><div className="mb-3 flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><span className="rounded-lg bg-primary/10 p-2 text-primary"><BusFront size={18}/></span>Bus {transport.bus.busNumber}</CardTitle><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${freshness === "LIVE" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{freshness}</span></div>
          <dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Registration</dt><dd className="font-medium">{transport.bus.registrationNumber || "Not recorded"}</dd></div><div><dt className="text-muted-foreground">Driver</dt><dd className="font-medium">{transport.bus.driver?.fullName ?? "Not assigned"}</dd></div><div><dt className="text-muted-foreground">Trip</dt><dd className="font-medium">{transport.trip?.status ?? "No active trip"}</dd></div><div><dt className="text-muted-foreground">Last GPS update</dt><dd className="font-medium">{lastUpdatedLabel}</dd></div></dl>
          <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">{connected ? <Wifi className="h-4 w-4 text-emerald-600"/> : <WifiOff className="h-4 w-4"/>}{connected ? "Realtime connection available" : "Realtime disconnected · refreshing periodically"}</div>
        </Card>
        <Card className="p-4"><CardTitle className="mb-3 text-base">Your stops</CardTitle><div className="space-y-3">{([["Pickup", transport.assignment.pickupStop], ["Drop-off", transport.assignment.dropoffStop]] as [string, Stop | null][]).map(([label, stop]) => <div key={label} className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{stop?.name ?? "Not assigned"}</p></div></div>)}</div>
          {transport.boarding && <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Latest boarding record: {transport.boarding.eventType.replace(/_/g, " ")} · {new Date(transport.boarding.occurredAt).toLocaleString()}</p>}
        </Card>
        {stops.length > 0 && <Card className="p-4"><CardTitle className="mb-3 text-base">Route stops</CardTitle><ol className="space-y-1">{stops.map((stop) => <li key={stop.id}><button type="button" onClick={() => setSelectedStopId(stop.id)} aria-pressed={selectedStopId === stop.id} className={`flex w-full gap-2 rounded-md p-2 text-left text-sm hover:bg-muted ${selectedStopId === stop.id ? "bg-muted" : ""}`}><span className="w-5 text-xs text-muted-foreground">{stop.sequence}.</span>{stop.name}</button></li>)}</ol>{selectedStopId && <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">Selected stop: {stops.find((stop) => stop.id === selectedStopId)?.name}</p>}</Card>}
      </aside>
    </div>
  </main>;
};

export default StudentTransportPage;
