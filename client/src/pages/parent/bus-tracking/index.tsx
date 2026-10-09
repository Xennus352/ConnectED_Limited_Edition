import React from "react";
import { useTranslation } from "react-i18next";
import { Section } from "@/components/layout";
import { useFleetSnapshot, useFleetRealtime, useFleetBuses, useConnection } from "@/features/fleet/hooks";
import { formatUpdatedTime } from "@/features/fleet/freshness";
import FleetMap from "@/features/fleet/components/FleetMap";
import ConnectionBadge from "@/features/fleet/components/ConnectionBadge";

const ParentBusTrackingPage: React.FC = () => {
  const { t } = useTranslation();

  // Load parent-scoped snapshot
  const { isLoading, isError } = useFleetSnapshot();

  // Subscribe to realtime events
  useFleetRealtime();

  // Get buses in parent's scope
  const buses = useFleetBuses();

  // Connection status
  const { lastDataAge } = useConnection();

  return (
    <Section id="parent-bus-tracking" title="Bus Tracking">
      <div className="p-4">
        {/* Status header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-medium">{t("fleet.liveFleet") || "Live Fleet"}</h2>
            <p className="text-sm text-muted">
              {t("fleet.childrenBuses") || "Your Children's Buses:"}
            </p>
          </div>
          <ConnectionBadge />
        </div>

        {/* Live count info */}
        <div className="mt-2 text-sm text-muted">
          <p>{t("fleet.busesEnRoute", { count: buses.length }) || `${buses.length} Buses En Route`}</p>
          <p>{formatUpdatedTime(lastDataAge ?? Date.now())}</p>
        </div>

        {/* Map */}
        {isLoading ? (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 text-center text-sm text-muted">
            {t("fleet.loadingFleet") || "Loading fleet snapshot..."}
          </div>
        ) : isError ? (
          <div className="mt-4 p-3 rounded-lg bg-error/10 text-error text-center text-sm">
            {t("fleet.errorLoading") || "Failed to load fleet data."}
          </div>
        ) : buses.length === 0 ? (
          <div className="mt-4 p-4 rounded-lg bg-muted/30 text-center text-sm text-muted">
            {t("fleet.noBuses") || "No buses assigned to your children."}
            <br/>
            {t("fleet.noActiveTrips") || "No active bus trips."}
          </div>
        ) : (
          <FleetMap
            buses={buses}
            selectedBusId={null}
            focus={null}
            onSelect={() => {}}
          />
        )}
      </div>
    </Section>
  );
};

export default ParentBusTrackingPage;
