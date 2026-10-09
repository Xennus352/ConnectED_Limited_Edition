/**
 * Shapes returned by the transportation API (`/admin/fleet`, `/parent/fleet`,
 * `/driver/bus`, `/buses/:id/track`) and the realtime events emitted over
 * Socket.IO. Keep these in sync with `server/src/modules/transportation`.
 */

export type BusStatus = "RUNNING" | "IDLE" | "STOPPED" | "OFFLINE";

/** How old a bus' last fix may be before the UI stops calling it live. */
export type Freshness = "LIVE" | "DELAYED" | "STALE" | "OFFLINE";

/** State of the realtime socket, distinct from any single bus' freshness. */
export type ConnectionStatus = "LIVE" | "CONNECTING" | "DISCONNECTED";

export interface FleetStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  /** Minutes from the start of the run (as stored on the route). */
  estimatedArrival?: number | null;
  isActive?: boolean;
  /** Riders boarding here. Present only for roles that may see students. */
  studentCount?: number;
}

export interface FleetRoute {
  id: string;
  name: string;
  description?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  estimatedDuration?: number | null;
  stops: FleetStop[];
}

/** A student riding a bus — names are role-gated by the backend. */
export interface FleetStudent {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
  pickupStopId?: string | null;
  dropoffStopId?: string | null;
}

export interface FleetDriver {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  profilePhoto?: string | null;
}

export interface FleetBus {
  id: string;
  busNumber: string;
  name: string;
  registrationNumber: string;
  capacity: number;
  status: BusStatus;
  isActive: boolean;
  /** `null` until the vehicle has reported a real fix. */
  latitude: number | null;
  longitude: number | null;
  speed: number;
  heading: number;
  lastLocationAt: string | null;
  route: FleetRoute | null;
  driver: FleetDriver | null;
  studentCount: number;
  students: FleetStudent[];
}

/** `bus:location` — the documented realtime payload. */
export interface BusLocationEvent {
  busId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  status: BusStatus;
  timestamp: string;
}

/** `bus:status` — emitted when a vehicle changes state. */
export interface BusStatusEvent {
  busId: string;
  status: BusStatus;
  lastLocationAt?: string | null;
  timestamp: string;
}

export interface FleetThresholds {
  freshSeconds: number;
  delayedSeconds: number;
  staleSeconds: number;
}

export interface FleetMapConfig {
  tileUrl: string;
  tileAttribution: string;
  center: [number, number];
  zoom: number;
}

export interface FleetMeta {
  serverTime: string;
  thresholds: FleetThresholds;
  map: FleetMapConfig;
}

export interface FleetSnapshot {
  buses: FleetBus[];
}

/** Generic `{ success, data, meta }` envelope used by the API. */
export interface FleetEnvelope<T> {
  success: boolean;
  data: T;
  meta?: FleetMeta;
}

/** Loading lifecycle of a fleet page. */
export type FleetLoadState = "idle" | "loading" | "ready" | "error";

/**
 * UI request to centre the map on a vehicle: `nonce` increments on every
 * "select this bus" action so repeated clicks on the same bus re-trigger.
 */
export interface MapFocus {
  busId: string;
  nonce: number;
}
