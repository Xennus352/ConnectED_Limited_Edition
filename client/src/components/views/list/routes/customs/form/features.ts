import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resetFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useRoutesService } from "@/services/transport";
import { nullableNumber } from "@/helpers/transport-payload";
import { IRoute, IRouteStop } from "@/interfaces/transport";

export interface IRouteFormValues {
  name: string;
  startLocation: string;
  endLocation: string;
  estimatedDuration: string;
  description: string;
  isActive: boolean;
}

export interface IStopDraft {
  _id?: string;
  name: string;
  sequence: number;
  estimatedArrival?: string;
}

const emptyRoute: IRouteFormValues = {
  name: "",
  startLocation: "",
  endLocation: "",
  estimatedDuration: "",
  description: "",
  isActive: true,
};

const useRouteFormFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { createRoute, updateRoute, createRouteStop, deleteRouteStop } =
    useRoutesService();
  const { modalType, actionType, dataId, data } = useAppSelector(
    (state) => state.fleetFormModal
  );

  const [initialValues, setInitialValues] = useState<IRouteFormValues>(emptyRoute);
  const [stops, setStops] = useState<IStopDraft[]>([]);
  const [removedStopIds, setRemovedStopIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mapRow = useCallback((row: IRoute): IRouteFormValues => ({
    name: row.name ?? "",
    startLocation: row.startLocation ?? "",
    endLocation: row.endLocation ?? "",
    estimatedDuration:
      row.estimatedDuration === null || row.estimatedDuration === undefined
        ? ""
        : String(row.estimatedDuration),
    description: row.description ?? "",
    isActive: row.isActive ?? true,
  }), []);

  const mapStops = useCallback((rowStops?: IRouteStop[]): IStopDraft[] =>
    (rowStops ?? [])
      .filter((stop) => stop.isActive !== false)
      .map((stop) => ({
        _id: stop._id,
        name: stop.name,
        sequence: stop.sequence ?? 0,
        estimatedArrival:
          stop.estimatedArrival === null || stop.estimatedArrival === undefined
            ? ""
            : Number.isFinite(Number(stop.estimatedArrival))
              ? String(Number(stop.estimatedArrival))
              : "",
      })), []);

  useEffect(() => {
    if (actionType === "edit" && data) {
      const row = data as IRoute;
      setInitialValues(mapRow(row));
      setStops(mapStops(row.stops));
      setRemovedStopIds([]);
    } else if (actionType === "add") {
      setInitialValues(emptyRoute);
      setStops([]);
      setRemovedStopIds([]);
    }
  }, [actionType, data, mapRow, mapStops]);

  const handleClose = useCallback(() => dispatch(resetFleetFormModal()), [dispatch]);

  const addStop = useCallback(() => {
    setStops((current) => [
      ...current,
      { name: "", sequence: current.length, estimatedArrival: "" },
    ]);
  }, []);

  const updateStop = useCallback(
    (index: number, patch: Partial<IStopDraft>) => {
      setStops((current) =>
        current.map((stop, i) => (i === index ? { ...stop, ...patch } : stop))
      );
    },
    []
  );

  const removeStop = useCallback(
    (index: number) => {
      setStops((current) => {
        const stop = current[index];
        if (stop?._id) {
          setRemovedStopIds((removed) => [...removed, stop._id!]);
        }
        return current.filter((_, i) => i !== index);
      });
    },
    []
  );

  const handleFormSubmit = async (values: IRouteFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: values.name,
        startLocation: values.startLocation,
        endLocation: values.endLocation,
        estimatedDuration: nullableNumber(values.estimatedDuration) ?? 0,
        description: values.description,
        isActive: values.isActive,
      };

      let routeId = dataId ?? "";

      if (actionType === "add" && modalType === "route") {
        const created = await createRoute.mutateAsync(payload);
        routeId = created?._id || created?.id || "";
      } else if (routeId) {
        await updateRoute.mutateAsync({ id: routeId, body: payload });
      }

      // Persist the stop list after the route itself exists — each stop is
      // a real RouteStop document on the server.
      for (const stop of stops) {
        if (!stop.name) continue;
        await createRouteStop.mutateAsync({
          routeId,
          name: stop.name,
          sequence: stop.sequence,
          estimatedArrival: nullableNumber(stop.estimatedArrival),
        });
      }
      for (const stopId of removedStopIds) {
        await deleteRouteStop.mutateAsync(stopId);
      }

      handleClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.response?.data?.message || t("transport_form.action_failed"));
    }
  };

  const isFormChanged = (values: IRouteFormValues) =>
    JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    loading,
    error,
    initialValues,
    stops,
    isFormChanged,
    handleFormSubmit,
    handleClose,
    addStop,
    updateStop,
    removeStop,
    actionType,
  };
};

export default useRouteFormFeatures;