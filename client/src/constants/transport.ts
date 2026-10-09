/** Option lists shared by the transport-management forms and filters. */

export const BUS_STATUS_OPTIONS = [
  { value: "OFFLINE", label: "Offline" },
  { value: "IDLE", label: "Idle" },
  { value: "RUNNING", label: "Running" },
  { value: "STOPPED", label: "Stopped" },
];

export const BUS_VEHICLE_TYPE_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "MINI", label: "Mini Bus" },
  { value: "VAN", label: "Van" },
  { value: "COACH", label: "Coach" },
  { value: "SPECIAL_NEEDS", label: "Special Needs" },
];

export const BUS_FUEL_TYPE_OPTIONS = [
  { value: "DIESEL", label: "Diesel" },
  { value: "PETROL", label: "Petrol" },
  { value: "ELECTRIC", label: "Electric" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "CNG", label: "CNG" },
  { value: "LPG", label: "LPG" },
];

export const TRIP_TYPE_OPTIONS = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "SPECIAL", label: "Special" },
  { value: "CUSTOM", label: "Custom" },
];

export const TRIP_STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DELAYED", label: "Delayed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "BOARDING", label: "Boarding" },
  { value: "ARRIVED", label: "Arrived" },
];

// Values must match the server's controlled vocabulary (MAINTENANCE_TYPES in
// server/src/modules/transportation/maintenance.ts) — a ticket whose type is
// not in that list is rejected at the API.
export const MAINTENANCE_TYPE_OPTIONS = [
  { value: "Scheduled service", label: "Scheduled Service" },
  { value: "Inspection", label: "Inspection" },
  { value: "Repair", label: "Repair" },
  { value: "Tires", label: "Tires" },
  { value: "Brakes", label: "Brakes" },
  { value: "Engine", label: "Engine" },
  { value: "Electrical", label: "Electrical" },
  { value: "Other", label: "Other" },
];

export const MAINTENANCE_STATUS_OPTIONS = [
  { value: "REPORTED", label: "Reported" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const MAINTENANCE_PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const MAINTENANCE_SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const INCIDENT_TYPE_OPTIONS = [
  { value: "ACCIDENT", label: "Accident" },
  { value: "MEDICAL", label: "Medical" },
  { value: "BREAKDOWN", label: "Breakdown" },
  { value: "ROUTE_DEVIATION", label: "Route Deviation" },
  { value: "SECURITY", label: "Security" },
  { value: "GPS_FAILURE", label: "GPS Failure" },
  { value: "OTHER", label: "Other" },
];

export const INCIDENT_SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const INCIDENT_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "RESOLVED", label: "Resolved" },
];