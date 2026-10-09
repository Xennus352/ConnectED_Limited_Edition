/**
 * Transport-management service: buses, routes, trips, maintenance, fuel,
 * incidents, reports and the driver console. Every call hits a real
 * server endpoint; the workflow actions (trip start/complete/delay,
 * maintenance approve/schedule/start/complete/cancel) are server-enforced
 * lifecycle transitions.
 */
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useAxiosInstance from "@/api";
import { useToast } from "@/hooks/use-toast";
import useQueryHandler from "@/hooks/useQueryHandler";

/** Read a numeric URL param with a default. */
const intParam = (params: URLSearchParams, key: string, fallback: number) => {
  const raw = parseInt(params.get(key) || "", 10);
  return Number.isFinite(raw) ? raw : fallback;
};

const allowedLimits = [10, 20, 50, 100];

/**
 * Builds the common list params (limit/page/search/status) plus any
 * entity-specific filters from the URL search string.
 */
const useListParams = (extraKeys: string[] = []) => {
  const [searchParams] = useSearchParams();
  const limit = intParam(searchParams, "limit", 10);
  const page = intParam(searchParams, "page", 1);

  const params: Record<string, string | number> = {
    limit: allowedLimits.includes(limit) ? limit : 10,
    page,
  };

  const search = searchParams.get("search");
  if (search) params.search = search;

  const status = searchParams.get("status");
  if (status) params.status = status;

  for (const key of extraKeys) {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  }

  // Date-range filters read by the shared crud buildWhere (startDate/dueDate).
  const startDate = searchParams.get("startDate");
  if (startDate) params.startDate = startDate;
  const dueDate = searchParams.get("dueDate");
  if (dueDate) params.dueDate = dueDate;

  return { params };
};

const useTransportMutations = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return {
    toast,
    t,
    queryClient,
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || t("transport_form.action_failed"),
      });
    },
  };
};

// ---------------------------------------------------------------------------
// Buses
// ---------------------------------------------------------------------------

export const useBusesService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();
  const { params } = useListParams(["isActive"]);

  const getAllBuses = useQueryHandler({
    queryKey: ["buses", params],
    queryFn: async () => {
      const response = await $axios.get("/buses", { params });
      return response?.data;
    },
    onError: () => {
      toast({ variant: "destructive", title: t("transport_form.fetch_failed") });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["buses"] });
    queryClient.invalidateQueries({ queryKey: ["drivers"] });
    queryClient.invalidateQueries({ queryKey: ["fleet", "snapshot"] });
  };

  const createBus = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/buses/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.create_success") });
      invalidate();
    },
    onError: onError,
  });

  const updateBus = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const response = await $axios.put(`/buses/${id}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.update_success") });
      invalidate();
    },
    onError: onError,
  });

  const deleteBus = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/buses/${id}`);
      return response?.data?.data;
    },
    onSuccess: (data) => {
      invalidate();
      toast({
        title: data?.archived
          ? t("bus_form.archived")
          : t("transport_form.delete_success"),
      });
    },
    onError: onError,
  });

  const restoreBus = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.post(`/buses/${id}/restore`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("bus_form.restored") });
      invalidate();
    },
    onError: onError,
  });

  return { getAllBuses, createBus, updateBus, deleteBus, restoreBus };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const useRoutesService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();
  const { params } = useListParams();

  const getAllRoutes = useQueryHandler({
    queryKey: ["routes", params],
    queryFn: async () => {
      const response = await $axios.get("/routes", { params });
      return response?.data;
    },
    onError: () => {
      toast({ variant: "destructive", title: t("transport_form.fetch_failed") });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["routes"] });
    queryClient.invalidateQueries({ queryKey: ["buses"] });
  };

  const createRoute = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/routes/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.create_success") });
      invalidate();
    },
    onError: onError,
  });

  const updateRoute = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const response = await $axios.put(`/routes/${id}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.update_success") });
      invalidate();
    },
    onError: onError,
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/routes/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.delete_success") });
      invalidate();
    },
    onError: onError,
  });

  /** Create one stop on an existing route (route must already exist). */
  const createRouteStop = useMutation({
    mutationFn: async (body: {
      routeId: string;
      name: string;
      sequence: number;
      estimatedArrival?: number | null;
      latitude?: number;
      longitude?: number;
    }) => {
      const response = await $axios.post("/route-stops/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: onError,
  });

  const deleteRouteStop = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/route-stops/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: onError,
  });

  return { getAllRoutes, createRoute, updateRoute, deleteRoute, createRouteStop, deleteRouteStop };
};

// ---------------------------------------------------------------------------
// Trips (admin)
// ---------------------------------------------------------------------------

export const useTripsService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();
  const { params } = useListParams(["bus", "driver", "route", "tripType"]);

  const getAllTrips = useQueryHandler({
    queryKey: ["trips", params],
    queryFn: async () => {
      const response = await $axios.get("/trips", { params });
      return response?.data;
    },
    onError: () => {
      toast({ variant: "destructive", title: t("transport_form.fetch_failed") });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["buses"] });
    queryClient.invalidateQueries({ queryKey: ["fleet", "snapshot"] });
  };

  const createTrip = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/trips/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.create_success") });
      invalidate();
    },
    onError: onError,
  });

  const updateTrip = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const response = await $axios.put(`/trips/${id}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.update_success") });
      invalidate();
    },
    onError: onError,
  });

  const deleteTrip = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/trips/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.delete_success") });
      invalidate();
    },
    onError: onError,
  });

  const runWorkflow = useMutation({
    mutationFn: async ({ tripId, action }: { tripId: string; action: "ready" | "cancel" }) => {
      const response = await $axios.post(`/trips/${tripId}/${action}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.action_success") });
      invalidate();
    },
    onError: onError,
  });

  return { getAllTrips, createTrip, updateTrip, deleteTrip, runWorkflow };
};

// ---------------------------------------------------------------------------
// Maintenance (admin)
// ---------------------------------------------------------------------------

export const useMaintenanceService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();
  const { params } = useListParams(["bus", "priority", "severity", "type"]);

  const getAllMaintenance = useQueryHandler({
    queryKey: ["maintenance", params],
    queryFn: async () => {
      const response = await $axios.get("/maintenance", { params });
      return response?.data;
    },
    onError: () => {
      toast({ variant: "destructive", title: t("transport_form.fetch_failed") });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["buses"] });
    queryClient.invalidateQueries({ queryKey: ["fleet", "snapshot"] });
  };

  const createMaintenance = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/maintenance/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.create_success") });
      invalidate();
    },
    onError: onError,
  });

  const updateMaintenance = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const response = await $axios.put(`/maintenance/${id}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.update_success") });
      invalidate();
    },
    onError: onError,
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/maintenance/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.delete_success") });
      invalidate();
    },
    onError: onError,
  });

  const completeMaintenance = useMutation({
    mutationFn: async ({
      recordId,
      body,
    }: {
      recordId: string;
      body: Record<string, unknown>;
    }) => {
      const response = await $axios.post(`/maintenance/${recordId}/complete`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.action_success") });
      invalidate();
    },
    onError: onError,
  });

  const runWorkflow = useMutation({
    mutationFn: async ({
      recordId,
      action,
    }: {
      recordId: string;
      action: "approve" | "schedule" | "start" | "cancel";
    }) => {
      const response = await $axios.post(`/maintenance/${recordId}/${action}`, {});
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.action_success") });
      invalidate();
    },
    onError: onError,
  });

  return {
    getAllMaintenance,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    completeMaintenance,
    runWorkflow,
  };
};

// ---------------------------------------------------------------------------
// Fuel (admin)
// ---------------------------------------------------------------------------

export const useFuelService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();
  const { params } = useListParams(["bus", "driver"]);

  const getAllFuel = useQueryHandler({
    queryKey: ["fuel", params],
    queryFn: async () => {
      const response = await $axios.get("/fuel", { params });
      return response?.data;
    },
    onError: () => {
      toast({ variant: "destructive", title: t("transport_form.fetch_failed") });
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fuel"] });

  const createFuel = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/fuel/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.create_success") });
      invalidate();
    },
    onError: onError,
  });

  const updateFuel = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const response = await $axios.put(`/fuel/${id}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.update_success") });
      invalidate();
    },
    onError: onError,
  });

  const deleteFuel = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/fuel/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.delete_success") });
      invalidate();
    },
    onError: onError,
  });

  return { getAllFuel, createFuel, updateFuel, deleteFuel };
};

// ---------------------------------------------------------------------------
// Incidents (admin)
// ---------------------------------------------------------------------------

export const useIncidentsService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();
  const { params } = useListParams(["bus", "type", "severity"]);

  const getAllIncidents = useQueryHandler({
    queryKey: ["incidents", params],
    queryFn: async () => {
      const response = await $axios.get("/incidents", { params });
      return response?.data;
    },
    onError: () => {
      toast({ variant: "destructive", title: t("transport_form.fetch_failed") });
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["incidents"] });

  const createIncident = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/incidents/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.create_success") });
      invalidate();
    },
    onError: onError,
  });

  const updateIncident = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const response = await $axios.put(`/incidents/${id}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.update_success") });
      invalidate();
    },
    onError: onError,
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/incidents/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.delete_success") });
      invalidate();
    },
    onError: onError,
  });

  const resolveIncident = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.post(`/incidents/${id}/resolve`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("incident_form.resolved") });
      invalidate();
    },
    onError: onError,
  });

  return { getAllIncidents, createIncident, updateIncident, deleteIncident, resolveIncident };
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const useReportsService = () => {
  const $axios = useAxiosInstance();

  const getSummary = useQueryHandler({
    queryKey: ["reports", "summary"],
    queryFn: async () => {
      const response = await $axios.get("/reports/summary");
      return response?.data?.data;
    },
    staleTime: 60_000,
  });

  const useCategory = (category: string, params: Record<string, string | number> = {}) =>
    useQueryHandler({
      queryKey: ["reports", category, params],
      queryFn: async () => {
        const response = await $axios.get(`/reports/${category}`, { params });
        return response?.data;
      },
      staleTime: 45_000,
    });

  /**
   * Server-generated CSV. The response is an attachment — the browser only
   * ever receives and saves the file, never downloads the raw records.
   */
  const downloadCsv = async (
    category: string,
    params: Record<string, string | number> = {}
  ) => {
    const response = await $axios.get(`/reports/${category}/csv`, {
      params,
      responseType: "blob",
    });
    const disposition = response.headers?.["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] ?? `connected-${category}-report.csv`;

    const url = window.URL.createObjectURL(response.data as Blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  return { getSummary, useCategory, downloadCsv };
};

// ---------------------------------------------------------------------------
// Driver console
// ---------------------------------------------------------------------------

export const useDriverService = () => {
  const $axios = useAxiosInstance();
  const { toast, t, queryClient, onError } = useTransportMutations();

  const getMyTrips = useQueryHandler({
    queryKey: ["driver", "trips"],
    queryFn: async () => {
      const response = await $axios.get("/driver/trips");
      return response?.data;
    },
    staleTime: 15_000,
  });

  const getMyBus = useQueryHandler({
    queryKey: ["driver", "bus"],
    queryFn: async () => {
      const response = await $axios.get("/driver/bus");
      return response?.data?.data;
    },
    staleTime: 30_000,
  });

  const getMyIncidents = useQueryHandler({
    queryKey: ["driver", "incidents"],
    queryFn: async () => {
      const response = await $axios.get("/driver/incidents");
      return response?.data ?? response;
    },
    staleTime: 30_000,
  });

  const invalidateMyTrips = () => {
    queryClient.invalidateQueries({ queryKey: ["driver", "trips"] });
    queryClient.invalidateQueries({ queryKey: ["driver", "bus"] });
    queryClient.invalidateQueries({ queryKey: ["fleet", "snapshot"] });
  };

  const startTrip = useMutation({
    mutationFn: async ({ tripId, body }: { tripId: string; body?: object }) => {
      const response = await $axios.post(
        `/driver/trips/${tripId}/start`,
        body ?? {}
      );
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("driver_trips.started") });
      invalidateMyTrips();
    },
    onError: onError,
  });

  const completeTrip = useMutation({
    mutationFn: async ({ tripId, body }: { tripId: string; body: object }) => {
      const response = await $axios.post(`/driver/trips/${tripId}/complete`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("driver_trips.completed") });
      invalidateMyTrips();
    },
    onError: onError,
  });

  const delayTrip = useMutation({
    mutationFn: async ({ tripId, body }: { tripId: string; body: object }) => {
      const response = await $axios.post(`/driver/trips/${tripId}/delay`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("driver_trips.delayed") });
      invalidateMyTrips();
    },
    onError: onError,
  });

  const reportIncident = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/driver/incidents", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("driver_trips.incident_reported") });
    },
    onError: onError,
  });

  return {
    getMyTrips,
    getMyBus,
    getMyIncidents,
    startTrip,
    completeTrip,
    delayTrip,
    reportIncident,
  };
};

// ---------------------------------------------------------------------------
// Shared lookups (form select data)
// ---------------------------------------------------------------------------

export const useTransportLookups = () => {
  const $axios = useAxiosInstance();

  const getAllDrivers = useQueryHandler({
    queryKey: ["drivers", "all"],
    queryFn: async () => {
      const response = await $axios.get("/drivers", {
        params: { limit: 200, search: "" },
      });
      return response?.data?.data ?? [];
    },
    staleTime: 60_000,
  });

  const getAllBuses = useQueryHandler({
    queryKey: ["buses", "all"],
    queryFn: async () => {
      const response = await $axios.get("/buses", {
        params: { limit: 200, search: "", isActive: "true" },
      });
      return response?.data?.data ?? [];
    },
    staleTime: 60_000,
  });

  const getAllRoutes = useQueryHandler({
    queryKey: ["routes", "all"],
    queryFn: async () => {
      const response = await $axios.get("/routes", {
        params: { limit: 200, search: "" },
      });
      return response?.data?.data ?? [];
    },
    staleTime: 60_000,
  });

  const getAllTrips = useQueryHandler({
    queryKey: ["trips", "all"],
    queryFn: async () => {
      const response = await $axios.get("/trips", {
        params: { limit: 200, search: "" },
      });
      return response?.data?.data ?? [];
    },
    staleTime: 60_000,
  });

  return { getAllDrivers, getAllBuses, getAllRoutes, getAllTrips };
};