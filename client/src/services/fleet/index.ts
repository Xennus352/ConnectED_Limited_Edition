/**
 * Transportation service: the HTTP side of the fleet feature.
 *
 * Only the snapshot is a query — every movement after that arrives over
 * Socket.IO. Trip start/stop and the driver's GPS posts are plain async
 * functions because they are imperative, user driven actions.
 */
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import useAxiosInstance from "@/api";
import useQueryHandler from "@/hooks/useQueryHandler";
import { TUser } from "@/interfaces/user";
import type { BusLocationEvent, FleetEnvelope, FleetSnapshot } from "@/features/fleet/types";

/** Query key for the role-scoped snapshot (kept out of the store on purpose). */
export const fleetKey = ["fleet", "snapshot"];

/**
 * Snapshot endpoint per role — the backend scopes the payload, the client
 * only picks which door to knock on. Returns an empty string for roles that
 * have no fleet snapshot (anonymous / transition states / unsupported roles)
 * so callers never fall through to the admin endpoint by mistake.
 */
/** Picks the snapshot endpoint that matches the signed-in role. */
export const fleetEndpointForRole = (role: string | undefined): string => {
  if (role === "parent") return "/parent/fleet";
  if (role === "driver") return "/driver/bus";
  if (role === "admin" || role === "super-admin") return "/admin/fleet";
  return "";
};

export interface SendLocationInput {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export const useFleetService = () => {
  const $axios = useAxiosInstance();
  const user = useAuthUser<TUser>() as TUser | null;
  const role = user?.role?.toLowerCase?.() ?? user?.role;
  /**
   * Which roles are allowed to touch each endpoint. Every consumer of
   * `useFleetService` mounts ALL of its query hooks eagerly (e.g. a driver
   * page that only needs `sendLocation` still subscribes the snapshot and
   * the buses list), so the hooks must never issue a request the current
   * role is not allowed to make. Without this gate, driver screens fire
   * `GET /buses` (403) and, during the sign-in transition when the auth
   * user has not resolved yet, `GET /admin/fleet` (401) into the console.
   */
  const isAdminRole =
    role === "admin" || role === "super-admin";
  const hasSnapshotRole =
    role === "parent" || role === "driver" || isAdminRole;
  const endpoint = fleetEndpointForRole(role);

  const getFleetSnapshot = useQueryHandler({
    queryKey: [...fleetKey, role ?? "anonymous"],
    queryFn: async () => {
      if (!hasSnapshotRole || !endpoint) return null;
      const response = await $axios.get<FleetEnvelope<FleetSnapshot | unknown>>(endpoint);
      return response?.data;
    },
    staleTime: 30_000,
    retry: 1,
    enabled: hasSnapshotRole,
  });

  /**
   * Every vehicle, unpaginated — used by the driver form's "assigned bus"
   * selector. Each `bus` row carries its `driver` relation so the form can
   * exclude vehicles that are already assigned. Admin-only: the underlying
   * endpoint is role-scoped, and the hook is eagerly subscribed by every
   * `useFleetService` consumer, so non-admins must never fire it.
   */
  const getAllBusesUnpaginated = useQueryHandler({
    queryKey: ["buses", "all"],
    queryFn: async () => {
      if (!isAdminRole) return [];
      const response = await $axios.get("/buses", { params: { search: "" } });
      return response?.data?.data || [];
    },
    staleTime: 30_000,
    retry: 1,
    enabled: isAdminRole,
  });

  /** Route geometry + stops for one vehicle (used as a fallback/refresh). */
  const getBusTrack = async (busId: string) => {
    const response = await $axios.get<FleetEnvelope<unknown>>(`/buses/${busId}/track`);
    return response?.data;
  };

  /** Driver: begin broadcasting (status flips to RUNNING server-side). */
  const startTrip = async (busId: string) => {
    const response = await $axios.post(`/buses/${busId}/start-trip`);
    return response?.data;
  };

  /** Driver: end the broadcast (status flips to STOPPED server-side). */
  const stopTrip = async (busId: string) => {
    const response = await $axios.post(`/buses/${busId}/stop-trip`);
    return response?.data;
  };

  /**
   * Driver: publish one GPS fix. The server validates ownership and
   * coordinates, persists them and fans the event out to subscribers.
   */
  const sendLocation = async (busId: string, input: SendLocationInput) => {
    const response = await $axios.post<BusLocationEvent>(
      `/buses/${busId}/location`,
      input
    );
    return response?.data;
  };

  return { getFleetSnapshot, getAllBusesUnpaginated, getBusTrack, startTrip, stopTrip, sendLocation };
};

export default useFleetService;
