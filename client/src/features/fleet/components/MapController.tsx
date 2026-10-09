/**
 * Map behaviour that cannot be expressed declaratively:
 *
 *  - the first frame is framed on the fleet (or the configured centre when
 *    nobody has reported yet),
 *  - `[ Follow Bus ]` keeps a vehicle centred until the user pans by hand,
 *    at which point following is dropped and must be resumed explicitly,
 *  - clicking a bus in the panel centres and opens that vehicle.
 *
 * Programmatic moves are flagged so they never count as a manual pan.
 */
import React, { useCallback, useEffect, useRef } from "react";
import * as L from "leaflet";
import { useMap } from "react-leaflet";

import { hasFix } from "../freshness";
import type { FleetBus, FleetMapConfig, MapFocus } from "../types";

interface MapControllerProps {
  buses: FleetBus[];
  mapConfig: FleetMapConfig | null;
  followBusId?: string | null;
  focus: MapFocus | null;
  onFollowInterrupted?: () => void;
}

const MapController: React.FC<MapControllerProps> = ({
  buses,
  mapConfig,
  followBusId,
  focus,
  onFollowInterrupted,
}) => {
  const map = useMap();
  const programmatic = useRef(false);
  const previousFollow = useRef<string | null>(null);
  const lastFollowTarget = useRef<[number, number] | null>(null);
  const framed = useRef(false);

  /**
   * Minimum fix displacement (≈ 60 m at Taungoo's latitude) before follow
   * mode re-centres the map. GPS jitter below this must not trigger an
   * animated pan — otherwise the map visibly flashes on every tick.
   */
  const MIN_FOLLOW_DELTA = 0.0006;

  /** Runs a map move that must not be mistaken for a user gesture. */
  const run = useCallback(
    (move: () => void) => {
      programmatic.current = true;
      move();
      let timer = 0;
      const release = () => {
        programmatic.current = false;
        map.off("moveend", release);
        window.clearTimeout(timer);
      };
      timer = window.setTimeout(release, 1200);
      map.on("moveend", release);
    },
    [map]
  );

  // A pan/zoom the user started by hand stops the follow mode.
  useEffect(() => {
    const onMoveStart = () => {
      if (programmatic.current) return;
      if (followBusId) onFollowInterrupted?.();
    };
    map.on("movestart", onMoveStart);
    return () => {
      map.off("movestart", onMoveStart);
    };
  }, [map, followBusId, onFollowInterrupted]);

  // First framing: the fleet when it has positions, otherwise the configured
  // city centre — a map with no data must still show the right city.
  useEffect(() => {
    if (!mapConfig || framed.current) return;
    framed.current = true;

    const located = buses.filter(hasFix);
    if (located.length > 0) {
      const bounds = L.latLngBounds(
        located.map((bus) => [bus.latitude as number, bus.longitude as number] as [number, number])
      );
      run(() => map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 }));
    } else {
      run(() => map.setView(mapConfig.center, mapConfig.zoom, { animate: false }));
    }
    // Only the arrival of the map configuration triggers framing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapConfig, run, map]);

  // Follow: centre on selection, then keep centring as fixes arrive.
  useEffect(() => {
    if (!followBusId) {
      previousFollow.current = null;
      lastFollowTarget.current = null;
      return;
    }
    const bus = buses.find((candidate) => candidate.id === followBusId);
    if (!bus || !hasFix(bus)) return;

    const target: [number, number] = [bus.latitude as number, bus.longitude as number];
    const followingSameBus = previousFollow.current === followBusId;
    previousFollow.current = followBusId;

    const prev = lastFollowTarget.current;
    const farEnough =
      !prev ||
      Math.abs(prev[0] - target[0]) > MIN_FOLLOW_DELTA ||
      Math.abs(prev[1] - target[1]) > MIN_FOLLOW_DELTA;
    lastFollowTarget.current = target;

    if (followingSameBus && !farEnough) return; // same spot — nothing to animate

    run(() => {
      if (!followingSameBus || map.getZoom() < 12) {
        map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.5 });
      } else {
        map.panTo(target, { animate: true, duration: 1, easeLinearity: 0.4 });
      }
    });
  }, [followBusId, buses, run, map]);

  // Panel selection: centre on (and therefore reveal) the chosen vehicle.
  useEffect(() => {
    if (!focus || focus.nonce <= 0) return;
    const bus = buses.find((candidate) => candidate.id === focus.busId);
    if (!bus || !hasFix(bus)) return;

    run(() =>
      map.flyTo(
        [bus.latitude as number, bus.longitude as number],
        Math.max(map.getZoom(), 14),
        { duration: 0.5 }
      )
    );
    // `buses` intentionally omitted: only a new focus request should move the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, run, map]);

  return null;
};

export default MapController;
