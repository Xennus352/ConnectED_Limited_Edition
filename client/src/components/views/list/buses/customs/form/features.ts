import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resetFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useBusesService } from "@/services/transport";
import { useTransportLookups } from "@/services/transport";
import {
  nullableNumber,
  nullableString,
  nullableDate,
  numberOr,
} from "@/helpers/transport-payload";
import { IBusFull } from "@/interfaces/transport";

export interface IBusFormValues {
  busNumber: string;
  registrationNumber: string;
  name: string;
  capacity: string;
  make: string;
  model: string;
  year: string;
  color: string;
  vehicleType: string;
  fuelType: string;
  fuelConsumption: string;
  mileage: string;
  purchasePrice: string;
  purchaseDate: string;
  warrantyExpiresAt: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiresAt: string;
  lastInspectionAt: string;
  nextInspectionDueAt: string;
  registrationExpiresAt: string;
  notes: string;
  status: string;
  driverId: string;
  routeId: string;
}

const emptyBus: IBusFormValues = {
  busNumber: "",
  registrationNumber: "",
  name: "",
  capacity: "30",
  make: "",
  model: "",
  year: "",
  color: "",
  vehicleType: "",
  fuelType: "",
  fuelConsumption: "",
  mileage: "",
  purchasePrice: "",
  purchaseDate: "",
  warrantyExpiresAt: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceExpiresAt: "",
  lastInspectionAt: "",
  nextInspectionDueAt: "",
  registrationExpiresAt: "",
  notes: "",
  status: "OFFLINE",
  driverId: "",
  routeId: "",
};

const useBusFormFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { createBus, updateBus } = useBusesService();
  const { getAllDrivers, getAllRoutes } = useTransportLookups();
  const { modalType, actionType, dataId, data } = useAppSelector(
    (state) => state.fleetFormModal
  );

  const [initialValues, setInitialValues] = useState<IBusFormValues>(emptyBus);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: drivers = [] } = getAllDrivers;
  const { data: routes = [] } = getAllRoutes;

  const mapRow = useCallback((row: IBusFull): IBusFormValues => {
    const str = (value: unknown) => (value ?? "") as string;
    const numStr = (value: unknown) =>
      value === null || value === undefined || value === ""
        ? ""
        : String(value);
    const dateStr = (value: unknown) => str(value);
    return {
      busNumber: str(row.busNumber),
      registrationNumber: str(row.registrationNumber),
      name: str(row.name),
      capacity: numStr(row.capacity ?? 30),
      make: str(row.make),
      model: str(row.model),
      year: numStr(row.year),
      color: str(row.color),
      vehicleType: str(row.vehicleType),
      fuelType: str(row.fuelType),
      fuelConsumption: numStr(row.fuelConsumption),
      mileage: numStr(row.mileage),
      purchasePrice: numStr(row.purchasePrice),
      purchaseDate: dateStr(row.purchaseDate),
      warrantyExpiresAt: dateStr(row.warrantyExpiresAt),
      insuranceProvider: str(row.insuranceProvider),
      insurancePolicyNumber: str(row.insurancePolicyNumber),
      insuranceExpiresAt: dateStr(row.insuranceExpiresAt),
      lastInspectionAt: dateStr(row.lastInspectionAt),
      nextInspectionDueAt: dateStr(row.nextInspectionDueAt),
      registrationExpiresAt: dateStr(row.registrationExpiresAt),
      notes: str(row.notes),
      status: str(row.status) || "OFFLINE",
      driverId: (row.driver?._id as string) || "",
      routeId: (row.route?._id as string) || "",
    };
  }, []);

  useEffect(() => {
    if (actionType === "edit" && data) {
      setInitialValues(mapRow(data as IBusFull));
    } else if (actionType === "add") {
      setInitialValues(emptyBus);
    }
  }, [actionType, data, mapRow]);

  const handleClose = useCallback(() => {
    dispatch(resetFleetFormModal());
  }, [dispatch]);

  const handleFormSubmit = async (values: IBusFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        busNumber: values.busNumber,
        registrationNumber: values.registrationNumber,
        name: values.name,
        capacity: numberOr(values.capacity, 30),
        make: values.make,
        model: values.model,
        year: nullableNumber(values.year),
        color: values.color,
        vehicleType: values.vehicleType,
        fuelType: values.fuelType,
        fuelConsumption: nullableNumber(values.fuelConsumption),
        mileage: nullableNumber(values.mileage),
        purchasePrice: nullableNumber(values.purchasePrice),
        purchaseDate: nullableDate(values.purchaseDate),
        warrantyExpiresAt: nullableDate(values.warrantyExpiresAt),
        insuranceProvider: values.insuranceProvider,
        insurancePolicyNumber: values.insurancePolicyNumber,
        insuranceExpiresAt: nullableDate(values.insuranceExpiresAt),
        lastInspectionAt: nullableDate(values.lastInspectionAt),
        nextInspectionDueAt: nullableDate(values.nextInspectionDueAt),
        registrationExpiresAt: nullableDate(values.registrationExpiresAt),
        notes: values.notes,
        status: values.status,
        driverId: nullableString(values.driverId),
        routeId: nullableString(values.routeId),
      };

      if (actionType === "add" && modalType === "bus") {
        await createBus.mutateAsync(payload);
      } else if (dataId) {
        await updateBus.mutateAsync({ id: dataId, body: payload });
      }

      handleClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.response?.data?.message || t("transport_form.action_failed"));
    }
  };

  const isFormChanged = (values: IBusFormValues) =>
    JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    loading,
    error,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    handleClose,
    actionType,
    allDrivers: drivers,
    allRoutes: routes,
  };
};

export default useBusFormFeatures;