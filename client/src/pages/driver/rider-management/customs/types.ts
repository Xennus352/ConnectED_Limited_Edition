/** Shared shapes for the driver rider-management screen. */

/** A stop on the driver's route (the same geometry the map draws). */
export interface StopOption {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  isActive?: boolean;
}

/** A student the driver can assign to the bus. */
export interface StudentOption {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
  className?: string | null;
}

/** One rider assignment as rendered in the table. */
export interface Rider {
  /** `BusStudentAssignment` id — the thing edit/delete operate on. */
  id: string;
  studentId: string;
  fullName: string;
  profilePhoto?: string | null;
  pickupStopId?: string | null;
  dropoffStopId?: string | null;
  pickupStopName?: string | null;
  dropoffStopName?: string | null;
}

/** Payload submitted by the add/edit dialog. */
export interface RiderFormValues {
  studentId: string;
  pickupStopId: string | null;
  dropoffStopId: string | null;
}
