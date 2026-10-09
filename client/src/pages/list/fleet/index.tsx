import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, BusFront, RefreshCw } from "lucide-react";

import { Section } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGsapReveal } from "@/hooks/useGsapReveal";

import {
  useFleetSnapshot,
  useFleetRealtime,
  useFleetBuses,
  useLiveBusCount,
  useFleetSelector,
  useConnection,
} from "@/features/fleet/hooks";
import { formatAge, hasFix } from "@/features/fleet/freshness";
import FleetMap from "@/features/fleet/components/FleetMap";
import FleetStatsCards from "@/features/fleet/components/FleetStatsCards";
import BusList from "@/features/fleet/components/BusList";
import ConnectionBadge from "@/features/fleet/components/ConnectionBadge";
import FollowControl from "@/features/fleet/components/FollowControl";
import {
  MapOverlay,
  ConnectionLostBanner,
} from "@/features/fleet/components/MapOverlays";

const FleetPage: React.FC = () => {
  const { t } = useTranslation();

  // Load the role-scoped snapshot once and subscribe to realtime telemetry.
  // NOTE: without useFleetSnapshot() the store stays empty and the map shows
  // "No buses available" — this is the load that populates everything below.
  const { reload } = useFleetSnapshot();
  useFleetRealtime();

  const buses = useFleetBuses();
  const clockOffset = useFleetSelector((state) => state.clockOffset);
  const loadState = useFleetSelector((state) => state.loadState);
  const errorKey = useFleetSelector((state) => state.error);
  const socketConnected = useFleetSelector((state) => state.socketConnected);
  const { count: liveCount } = useLiveBusCount();
  const { lastDataAge } = useConnection();

  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [followBusId, setFollowBusId] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const lastFollowedBusId = useRef<string | null>(null);

  /** Clicking a bus (row or marker) selects it and gently follows it. */
  const selectBus = useCallback((busId: string) => {
    setSelectedBusId(busId);
    setInterrupted(false);
    setFollowBusId(busId);
    lastFollowedBusId.current = busId;
  }, []);

  const stopFollow = useCallback(() => {
    setFollowBusId(null);
    setInterrupted(false);
  }, []);

  /** A manual pan while following drops follow mode and offers "resume". */
  const onFollowInterrupted = useCallback(() => {
    if (followBusId) lastFollowedBusId.current = followBusId;
    setFollowBusId(null);
    setInterrupted(true);
  }, [followBusId]);

  const resumeFollow = useCallback(() => {
    if (!lastFollowedBusId.current) return;
    setFollowBusId(lastFollowedBusId.current);
    setSelectedBusId(lastFollowedBusId.current);
    setInterrupted(false);
  }, []);

  const located = useMemo(() => buses.filter(hasFix), [buses]);
  const selectedBus = useMemo(
    () => buses.find((bus) => bus.id === selectedBusId) ?? null,
    [buses, selectedBusId]
  );

  // Friendly overlay for the map: loading → error → empty → disconnected.
  const overlay = useMemo(() => {
    if (errorKey) {
      return (
        <MapOverlay
          tone='danger'
          title={t(errorKey)}
          description={t("fleet.errorLoading")}
          action={
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={reload}
              className='gap-1.5'
            >
              <RefreshCw className='size-3.5' aria-hidden='true' />
              {t("fleet.action.retry")}
            </Button>
          }
        />
      );
    }
    if (loadState !== "ready") {
      return <MapOverlay title={t("fleet.loadingFleet")} />;
    }
    if (located.length === 0) {
      return (
        <MapOverlay
          title={t("fleet.empty.no_buses")}
          description={t("fleet.empty.no_buses_hint")}
        />
      );
    }
    if (!socketConnected) {
      return <ConnectionLostBanner onRetry={reload} />;
    }
    return null;
  }, [errorKey, loadState, located.length, socketConnected, reload, t]);

  // GSAP entrance for the whole page (once on mount).
  const revealRoot = useGsapReveal<HTMLDivElement>();

  return (
    <Section id='fleet-page' title={t("fleet.liveFleet")}>
      <div ref={revealRoot} className='flex flex-col gap-4'>
        {/* Toolbar: connection state + live summary + refresh */}
        <div
          data-gsap-stagger
          className='flex flex-wrap items-center gap-2'
          role='status'
        >
          <ConnectionBadge />

          <span className='inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium shadow-sm'>
            <span className='relative flex size-2.5'>
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                  liveCount > 0 ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              <span
                className={`relative inline-flex size-2.5 rounded-full ${
                  liveCount > 0 ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
            </span>
            {liveCount > 0 ? (
              <>
                <span className='font-bold text-foreground'>{liveCount}</span>
                <span className='text-muted-foreground'>
                  {t("fleet.enRoute")}
                </span>
              </>
            ) : (
              <span className='text-muted-foreground'>
                {t("fleet.noActiveBuses")}
              </span>
            )}
          </span>

          {lastDataAge !== null ? (
            <span className='inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm'>
              <Activity className='size-3.5' aria-hidden='true' />
              {t("fleet.updatedAgo", { age: formatAge(lastDataAge) })}
            </span>
          ) : null}

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={reload}
            className='h-8 gap-1.5 px-2.5 text-xs shadow-sm'
          >
            <RefreshCw className='size-3.5' aria-hidden='true' />
            {t("fleet.action.retry")}
          </Button>
        </div>

        {/* KPI tiles */}
        <div data-gsap-stagger>
          <FleetStatsCards />
        </div>

        {/* Map + live bus list */}
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]'>
          <div
            data-gsap='scale-in'
            className='relative h-[52vh] min-h-[340px] overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[560px]'
          >
            <FleetMap
              buses={buses}
              selectedBusId={selectedBusId}
              focus={null}
              followBusId={followBusId}
              onSelect={selectBus}
              onFollowInterrupted={onFollowInterrupted}
              overlay={overlay}
            />
            <FollowControl
              selectedLabel={
                selectedBus ? `${selectedBus.busNumber} · ${selectedBus.name}` : null
              }
              followBusId={followBusId}
              interrupted={interrupted}
              canFollow={Boolean(selectedBus && hasFix(selectedBus))}
              onFollow={() => {
                if (selectedBus) selectBus(selectedBus.id);
              }}
              onResume={resumeFollow}
              onStop={stopFollow}
            />
          </div>

          <div
            data-gsap='fade-up'
            className='flex h-[52vh] min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm lg:h-[560px]'
          >
            <div className='mb-2 flex shrink-0 items-center gap-2 px-1'>
              <BusFront className='size-4 text-primary' aria-hidden='true' />
              <h3 className='text-sm font-semibold'>{t("fleet.liveBuses")}</h3>
              <Badge variant='secondary' className='ml-auto'>
                {buses.length}
              </Badge>
            </div>
            <BusList
              buses={buses}
              selectedBusId={selectedBusId}
              followBusId={followBusId}
              clockOffset={clockOffset}
              onSelect={selectBus}
              onFollow={selectBus}
            />
          </div>
        </div>
      </div>
    </Section>
  );
};

export default FleetPage;