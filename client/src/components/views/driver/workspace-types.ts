import type { Freshness } from "@/features/fleet/types";
import type { RouteProgress } from "@/lib/driver-geo";

/** Trip rows returned by the driver console endpoint. */
export interface DriverDataTrip {
  _id: string;
  tripType: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  delayMinutes?: number;
  odometerStart?: number | null;
  odometerEnd?: number | null;
  distanceKm?: number | null;
  notes?: string;
  route?: {
    name?: string;
    startLocation?: string;
    endLocation?: string;
  } | null;
  bus?: { busNumber?: string } | null;
  driver?: { fullName?: string } | null;
}

export interface DriverConnectionView {
  status: "LIVE" | "CONNECTING" | "DISCONNECTED";
  lastDataAge: number | null;
  hasData: boolean;
}

export interface UseDriverWorkspaceReturn {
  trips: DriverDataTrip[];
  assigned: any;
  hasAssignedBus: boolean;
  loadingBus: boolean;
  loadingTrips: boolean;
  loadingIncidents: boolean;
  currentTrip: DriverDataTrip | null;
  nextTrip: DriverDataTrip | null;
  incidents: any[];
  freshness: Freshness;
  connection: DriverConnectionView;
  hasGpsFix: boolean;
  geo: RouteProgress | null;
  onDuty: boolean;
  snapshot: {
    isLoading: boolean;
    isError: boolean;
    reload: () => void;
  };
  actions: {
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
    reportIncident: {
      isPending: boolean;
      mutateAsync: (body: object) => Promise<unknown>;
    };
  };
  refetch: () => void;
}