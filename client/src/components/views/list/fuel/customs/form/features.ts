import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resetFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useFuelService, useTransportLookups } from "@/services/transport";
import { nullableNumber } from "@/helpers/transport-payload";
import { IFuelRecord } from "@/interfaces/transport";

export interface IFuelFormValues {
  busId: string;
  driverId: string;
  date: string;
  liters: string;
  pricePerLiter: string;
  totalCost: string;
  station: string;
  notes: string;
}

const emptyFuel: IFuelFormValues = {
  busId: "",
  driverId: "",
  date: new Date().toISOString().slice(0, 10),
  liters: "",
  pricePerLiter: "",
  totalCost: "",
  station: "",
  notes: "",
};

const useFuelFormFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { createFuel, updateFuel } = useFuelService();
  const { getAllBuses, getAllDrivers } = useTransportLookups();
  const { modalType, actionType, dataId, data } = useAppSelector(
    (state) => state.fleetFormModal
  );

  const [initialValues, setInitialValues] = useState<IFuelFormValues>(emptyFuel);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: buses = [] } = getAllBuses;
  const { data: drivers = [] } = getAllDrivers;

  const mapRow = useCallback((row: IFuelRecord): IFuelFormValues => {
    const numStr = (value: unknown) =>
      value === null || value === undefined || value === "" ? "" : String(value);
    const dateStr = (value: unknown) =>
      value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10);
    return {
      busId: row.busId || (row.bus?._id as string) || "",
      driverId: row.driverId || (row.driver?._id as string) || "",
      date: dateStr(row.date),
      liters: numStr(row.liters),
      pricePerLiter: numStr(row.pricePerLiter),
      totalCost: numStr(row.totalCost),
      station: row.station || "",
      notes: row.notes || "",
    };
  }, []);

  useEffect(() => {
    if (actionType === "edit" && data) {
      setInitialValues(mapRow(data as IFuelRecord));
    } else if (actionType === "add") {
      setInitialValues(emptyFuel);
    }
  }, [actionType, data, mapRow]);

  const handleClose = useCallback(() => dispatch(resetFleetFormModal()), [dispatch]);

  const handleFormSubmit = async (values: IFuelFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        busId: values.busId,
        driverId: values.driverId,
        date: values.date,
        liters: nullableNumber(values.liters),
        pricePerLiter: nullableNumber(values.pricePerLiter),
        totalCost: nullableNumber(values.totalCost),
        station: values.station,
        notes: values.notes,
      };

      if (actionType === "add" && modalType === "fuel") {
        await createFuel.mutateAsync(payload);
      } else if (dataId) {
        await updateFuel.mutateAsync({ id: dataId, body: payload });
      }

      handleClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.response?.data?.message || t("transport_form.action_failed"));
    }
  };

  const isFormChanged = (values: IFuelFormValues) =>
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
  };
};

export default useFuelFormFeatures;