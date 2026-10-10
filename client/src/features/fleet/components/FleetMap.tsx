import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";

import { useFleetSelector } from "../hooks";
import BusMarker from "./BusMarker";

import MapController from "./MapController";
import RouteLayer from "./RouteLayer";
import type { FleetBus, MapFocus } from "../types";

/** Taungoo — used only until the server snapshot supplies map config. */
const FALLBACK_CENTER: [number, number] = [18.94, 96.43];
const FALLBACK_ZOOM = 13;
const FALLBACK_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const FALLBACK_ATTRIBUTION = "&copy; OpenStreetMap contributors";

interface FleetMapProps {
  buses: FleetBus[];
  selectedBusId: string | null;
  focus?: MapFocus | null;
  onSelect: (busId: string) => void;
  followBusId?: string | null;
  onFollowInterrupted?: () => void;
  className?: string;
  /** Overlays drawn above the tiles (loading, empty, lost connection). */
  overlay?: React.ReactNode;
}

const FleetMap: React.FC<FleetMapProps> = ({
  buses,
  selectedBusId,
  focus,
  onSelect,
  followBusId,
  onFollowInterrupted,
  className = "",
  overlay,
}) => {
  const { t } = useTranslation();
  const meta = useFleetSelector((state) => state.meta);
  const clockOffset = useFleetSelector((state) => state.clockOffset);

  const mapConfig = meta?.map ?? null;
  const located = useMemo(
    () => buses.filter((bus) => bus.latitude !== null && bus.longitude !== null),
    [buses]
  );

  return (
    <div className={`fleet-map relative h-full w-full overflow-hidden rounded-xl border bg-muted/40 ${className}`}>
      <MapContainer
        center={mapConfig?.center ?? FALLBACK_CENTER}
        zoom={mapConfig?.zoom ?? FALLBACK_ZOOM}
        className='h-full w-full bg-muted'
        zoomControl={true}
        preferCanvas={false}
      >
        <TileLayer
          key={mapConfig?.tileUrl || FALLBACK_TILES}
          url={mapConfig?.tileUrl || FALLBACK_TILES}
          attribution={mapConfig?.tileAttribution || FALLBACK_ATTRIBUTION}
        />

        <MapController
          buses={located}
          mapConfig={mapConfig}
          focus={followBusId !== null ? (focus ?? null) : null}
          followBusId={followBusId}
          onFollowInterrupted={onFollowInterrupted}
        />

        <RouteLayer selectedBusId={selectedBusId} />

        {located.map((bus) => (
          <BusMarker
            key={bus.id}
            bus={bus}
            selected={bus.id === selectedBusId}
            focusNonce={focus && focus.busId === bus.id ? focus.nonce : 0}
            clockOffset={clockOffset}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>

      {/* Tiny tiled-map credit — replaces the hidden Leaflet attribution control
          so the OpenStreetMap tile licence stays satisfied. */}
      <span className='pointer-events-none absolute bottom-1 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white/80'>
        © OpenStreetMap contributors
      </span>

      {/* Loading overlay when no data yet */}
      {located.length === 0 && !overlay && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          {t("fleet.empty.no_buses")}
        </div>
      )}

      {overlay}
    </div>
  );
};

export default FleetMap;
