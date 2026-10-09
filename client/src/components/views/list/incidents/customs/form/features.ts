import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resetFleetFormModal } from "@/store/slices/fleet-form-modal";
import {
  useIncidentsService,
  useTransportLookups,
} from "@/services/transport";
import { nullableString } from "@/helpers/transport-payload";
import { IIncident } from "@/interfaces/transport";

export interface IIncidentFormValues {
  busId: string;
  driverId: string;
  tripId: string;
  routeId: string;
  type: string;
  severity: string;
  occurredAt: Date | null;
  description: string;
}

const emptyIncident: IIncidentFormValues = {
  busId: "",
  driverId: "",
  tripId: "",
  routeId: "",
  type: "OTHER",
  severity: "MEDIUM",
  occurredAt: new Date(),
  description: "",
};

const useIncidentFormFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { createIncident, updateIncident } = useIncidentsService();
  const { getAllBuses, getAllDrivers, getAllRoutes, getAllTrips } =
    useTransportLookups();
  const { modalType, actionType, dataId, data } = useAppSelector(
    (state) => state.fleetFormModal
  );

  const [initialValues, setInitialValues] =
    useState<IIncidentFormValues>(emptyIncident);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: buses = [] } = getAllBuses;
  const { data: drivers = [] } = getAllDrivers;
  const { data: routes = [] } = getAllRoutes;
  const { data: trips = [] } = getAllTrips;

  const mapRow = useCallback((row: IIncident): IIncidentFormValues => ({
    busId: row.busId || (row.bus?._id as string) || "",
    driverId: row.driverId || (row.driver?._id as string) || "",
    tripId: row.tripId || (row.trip?._id as string) || "",
    routeId: (row.route?._id as string) || "",
    type: row.type || "OTHER",
    severity: row.severity || "MEDIUM",
    occurredAt: row.occurredAt ? new Date(row.occurredAt) : new Date(),
    description: row.description || "",
  }), []);

  useEffect(() => {
    if (actionType === "edit" && data) {
      setInitialValues(mapRow(data as IIncident));
    } else if (actionType === "add") {
      setInitialValues(emptyIncident);
    }
  }, [actionType, data, mapRow]);

  const handleClose = useCallback(() => dispatch(resetFleetFormModal()), [dispatch]);

  const handleFormSubmit = async (values: IIncidentFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        busId: values.busId,
        driverId: values.driverId,
        tripId: nullableString(values.tripId),
        routeId: nullableString(values.routeId),
        type: values.type,
        severity: values.severity,
        occurredAt: values.occurredAt
          ? values.occurredAt.toISOString()
          : new Date().toISOString(),
        description: values.description,
      };

      if (actionType === "add" && modalType === "incident") {
        await createIncident.mutateAsync(payload);
      } else if (dataId) {
        await updateIncident.mutateAsync({ id: dataId, body: payload });
      }

      handleClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.response?.data?.message || t("transport_form.action_failed"));
    }
  };

  const isFormChanged = (values: IIncidentFormValues) =>
    JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    loading,
    error,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    allBuses: buses,
    allDrivers: drivers,
    allRoutes: routes,
    allTrips: trips,
  };
};

export default useIncidentFormFeatures;