/** Shape of a Bus as returned by the `/buses` endpoints. */
export interface IBus {
  _id: string;
  busNumber: string;
  name: string;
  registrationNumber: string;
  capacity: number;
  status: string;
  isActive: boolean;
  /** Populated by the buses list endpoints; null when the vehicle is unassigned. */
  driver?: {
    _id: string;
    fullName: string;
    phoneNumber: string;
    username: string;
    profilePhoto: string;
  } | null;
}