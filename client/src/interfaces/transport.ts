/**
 * Transport-management entity shapes as returned by the API.
 *
 * The server maps `_id` on every document, dates serialize as ISO strings
 * and relations arrive nested (`bus.driver`, `trip.bus`, ...).
 */

// ---------------------------------------------------------------------------
// Bus
// ---------------------------------------------------------------------------

export interface IBusDriverRef {
  _id: string;
  fullName: string;
  username?: string;
  profilePhoto?: string;
}

export interface IBusRouteRef {
  _id: string;
  name: string;
  startLocation?: string;
  endLocation?: string;
}

/** Full bus incl. the fleet-record details and populated relations. */
export interface IBusFull {
  _id: string;
  busNumber: string;
  registrationNumber: string;
  name: string;
  capacity: number;
  status: string;
  isActive: boolean;
  latitude?: number | null;
  longitude?: number | null;
  currentSpeed?: number | null;
  heading?: number | null;
  lastLocationAt?: string | null;
  // Fleet record details
  make?: string;
  model?: string;
  year?: number | null;
  color?: string;
  vehicleType?: string;
  fuelType?: string;
  fuelConsumption?: number | null;
  mileage?: number;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  warrantyExpiresAt?: string | null;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiresAt?: string | null;
  lastInspectionAt?: string | null;
  nextInspectionDueAt?: string | null;
  registrationExpiresAt?: string | null;
  notes?: string;
  driver?: IBusDriverRef | null;
  route?: IBusRouteRef | null;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Routes & stops
// ---------------------------------------------------------------------------

export interface IRouteStop {
  _id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  sequence?: number;
  estimatedArrival?: number | null;
  isActive?: boolean;
  arrivalTime?: string | null;
  departureTime?: string | null;
  description?: string;
}

export interface IRoute {
  _id: string;
  name: string;
  startLocation: string;
  endLocation: string;
  estimatedDuration?: number | null;
  description?: string;
  isActive?: boolean;
  stops?: IRouteStop[];
  buses?: Array<{ _id: string; busNumber: string; status: string }>;
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export interface ITrip {
  _id: string;
  tripType: string;
  status: string;
  busId: string;
  driverId: string;
  routeId?: string | null;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  delayMinutes?: number;
  odometerStart?: number | null;
  odometerEnd?: number | null;
  distanceKm?: number | null;
  startedBy?: string | null;
  completedBy?: string | null;
  notes?: string;
  createdAt?: string;
  bus?: { _id: string; busNumber: string; name?: string; status?: string };
  driver?: { _id: string; fullName: string; username?: string; profilePhoto?: string };
  route?: { _id: string; name: string; startLocation?: string; endLocation?: string };
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export interface IMaintenanceRecord {
  _id: string;
  busId: string;
  ticketNumber?: string;
  title?: string;
  type: string;
  status: string;
  priority?: string;
  severity?: string;
  blocksOperation?: boolean;
  mileage?: number | null;
  date: string;
  description?: string;
  reportedBy?: string | null;
  reportedByName?: string;
  reviewedBy?: string | null;
  reviewedByName?: string;
  serviceProvider?: string;
  technician?: string;
  plannedDate?: string | null;
  scheduledDate?: string | null;
  actualStartAt?: string | null;
  actualCompletedAt?: string | null;
  workPerformed?: string;
  partsReplaced?: string;
  partsCost?: number | null;
  laborCost?: number | null;
  otherCost?: number | null;
  totalCost?: number | null;
  inspectionResult?: string;
  cost?: number | null;
  performedBy?: string | null;
  nextDueAt?: string | null;
  nextDueMileage?: number | null;
  completedBy?: string | null;
  completedByName?: string;
  createdAt?: string;
  bus?: { _id: string; busNumber: string; name?: string; status?: string };
}

// ---------------------------------------------------------------------------
// Fuel & incidents
// ---------------------------------------------------------------------------

export interface IFuelRecord {
  _id: string;
  busId: string;
  liters?: number;
  pricePerLiter?: number | null;
  totalCost?: number | null;
  station?: string;
  date: string | null;
  notes?: string;
  driverId?: string | null;
  bus?: { _id: string; busNumber: string };
  driver?: { _id: string; fullName: string };
}

export interface IIncident {
  _id: string;
  busId: string;
  tripId?: string | null;
  driverId?: string | null;
  type: string;
  severity: string;
  status?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  occurredAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  bus?: { _id: string; busNumber: string };
  driver?: { _id: string; fullName: string; username?: string };
  trip?: { _id: string; tripType?: string; status?: string };
  route?: { _id: string; name?: string } | null;
}

// ---------------------------------------------------------------------------
// Assignments (student roster)
// ---------------------------------------------------------------------------

export interface IBusAssignment {
  _id: string;
  studentId: string;
  busId: string;
  routeId?: string | null;
  isActive?: boolean;
  pickupStopId?: string | null;
  dropoffStopId?: string | null;
  assignedAt: string;
  student?: { _id: string; fullName: string; profilePhoto?: string; class?: unknown };
  bus?: { _id: string; busNumber: string };
  pickupStop?: IRouteStop | null;
  dropoffStop?: IRouteStop | null;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface IReportRange {
  from: string | null;
  to: string | null;
}

export interface IReportSummary {
  generatedAt: string;
  range: IReportRange;
  fleet: {
    fleetSize: number;
    running: number;
    idle: number;
    stopped: number;
    maintenanceRestricted: number;
  };
  trips: {
    scheduled: number;
    ready: number;
    inProgress: number;
    delayed: number;
    completed: number;
    cancelled: number;
    total: number;
    completionRate: number;
    fleetUtilization: number;
  };
  performance: {
    totalDistanceKm: number;
    averageDurationMinutes: number;
    delays: number;
    driversActive: number;
  };
  expenses: { maintenance: number; fuel: number };
  upcoming: {
    inspectionsAndService: Array<{ busNumber: string; dueAt: string | null }>;
    expiringDocuments: Array<{
      busNumber: string;
      insuranceExpiresAt: string | null;
      registrationExpiresAt: string | null;
    }>;
  };
}

export type ReportCategory =
  | "fleet"
  | "trips"
  | "routes"
  | "drivers"
  | "maintenance"
  | "expenses"
  | "students";

export interface IReportCategoryResult {
  rows: any[];
  totals: Record<string, number | string>;
}

// ---------------------------------------------------------------------------
// Envelope + list helpers
// ---------------------------------------------------------------------------

export interface IListEnvelope<T> {
  success: boolean;
  data: T[];
  meta?: { total: number; skip: number; limit: number; page?: number };
  totals?: Record<string, number | string>;
}

export type TripStatus =
  | "SCHEDULED"
  | "READY"
  | "IN_PROGRESS"
  | "DELAYED"
  | "COMPLETED"
  | "CANCELLED";

export type MaintenanceStatus =
  | "REPORTED"
  | "APPROVED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";