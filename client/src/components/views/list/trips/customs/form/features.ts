import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resetFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useTripsService } from "@/services/transport";
import { useTransportLookups } from "@/services/transport";
import { ITrip } from "@/interfaces/transport";

export interface ITripFormValues {
  tripType: string;
  busId: string;
  driverId: string;
  routeId: string;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  notes: string;
}

const defaultStart = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
};

const emptyTrip: ITripFormValues = {
  tripType: "MORNING",
  busId: "",
  driverId: "",
  routeId: "",
  scheduledStartAt: defaultStart(),
  scheduledEndAt: null,
  notes: "",
};

const useTripFormFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { createTrip, updateTrip } = useTripsService();
  const { getAllBuses, getAllDrivers, getAllRoutes } = useTransportLookups();
  const { modalType, actionType, dataId, data } = useAppSelector(
    (state) => state.fleetFormModal
  );

  const [initialValues, setInitialValues] = useState<ITripFormValues>(emptyTrip);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: buses = [] } = getAllBuses;
  const { data: drivers = [] } = getAllDrivers;
  const { data: routes = [] } = getAllRoutes;

  const mapRow = useCallback((row: ITrip): ITripFormValues => ({
    tripType: row.tripType || "MORNING",
    busId: row.busId || (row.bus?._id as string) || "",
    driverId: row.driverId || (row.driver?._id as string) || "",
    routeId: row.routeId || (row.route?._id as string) || "",
    scheduledStartAt: row.scheduledStartAt ? new Date(row.scheduledStartAt) : null,
    scheduledEndAt: row.scheduledEndAt ? new Date(row.scheduledEndAt) : null,
    notes: row.notes || "",
  }), []);

  useEffect(() => {
    if (actionType === "edit" && data) {
      setInitialValues(mapRow(data as ITrip));
    } else if (actionType === "add") {
      setInitialValues(emptyTrip);
    }
  }, [actionType, data, mapRow]);

  const handleClose = useCallback(() => dispatch(resetFleetFormModal()), [dispatch]);

  const handleFormSubmit = async (values: ITripFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        tripType: values.tripType,
        busId: values.busId,
        driverId: values.driverId,
        routeId: values.routeId,
        scheduledStartAt: values.scheduledStartAt
          ? values.scheduledStartAt.toISOString()
          : null,
        scheduledEndAt: values.scheduledEndAt
          ? values.scheduledEndAt.toISOString()
          : null,
        notes: values.notes,
      };

      if (actionType === "add" && modalType === "trip") {
        await createTrip.mutateAsync(payload);
      } else if (dataId) {
        await updateTrip.mutateAsync({ id: dataId, body: payload });
      }

      handleClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.response?.data?.message || t("transport_form.action_failed"));
    }
  };

  const isFormChanged = (values: ITripFormValues) =>
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
  };
};

export default useTripFormFeatures;