import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resetFleetFormModal } from "@/store/slices/fleet-form-modal";
import {
  useMaintenanceService,
  useTransportLookups,
} from "@/services/transport";
import { nullableNumber, nullableString } from "@/helpers/transport-payload";
import { IMaintenanceRecord } from "@/interfaces/transport";

export interface IMaintenanceFormValues {
  busId: string;
  type: string;
  title: string;
  priority: string;
  severity: string;
  blocksOperation: boolean;
  date: string;
  description: string;
  mileage: string;
  // Completion fields
  workPerformed: string;
  partsReplaced: string;
  partsCost: string;
  laborCost: string;
  otherCost: string;
  inspectionResult: string;
  serviceProvider: string;
  technician: string;
  scheduledDate: string;
  plannedDate: string;
}

const emptyMaintenance: IMaintenanceFormValues = {
  busId: "",
  type: "Inspection",
  title: "",
  priority: "MEDIUM",
  severity: "MEDIUM",
  blocksOperation: true,
  date: new Date().toISOString().slice(0, 10),
  description: "",
  mileage: "",
  workPerformed: "",
  partsReplaced: "",
  partsCost: "",
  laborCost: "",
  otherCost: "",
  inspectionResult: "",
  serviceProvider: "",
  technician: "",
  scheduledDate: "",
  plannedDate: "",
};

const useMaintenanceFormFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    createMaintenance,
    updateMaintenance,
    completeMaintenance,
  } = useMaintenanceService();
  const { getAllBuses } = useTransportLookups();
  const { modalType, actionType, dataId, data } = useAppSelector(
    (state) => state.fleetFormModal
  );
  const isCompleteMode = actionType === "complete";

  const [initialValues, setInitialValues] =
    useState<IMaintenanceFormValues>(emptyMaintenance);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: buses = [] } = getAllBuses;

  const dateStr = (value: unknown) =>
    value ? String(value).slice(0, 10) : "";

  const mapRow = useCallback((row: IMaintenanceRecord): IMaintenanceFormValues => {
    const numStr = (value: unknown) =>
      value === null || value === undefined || value === "" ? "" : String(value);
    return {
      busId: row.busId || (row.bus?._id as string) || "",
      type: row.type || "ROUTINE",
      title: row.title || "",
      priority: row.priority || "MEDIUM",
      severity: row.severity || "MEDIUM",
      blocksOperation: Boolean(row.blocksOperation ?? true),
      date: dateStr(row.date || new Date()),
      description: row.description || "",
      mileage: numStr(row.mileage),
      workPerformed: row.workPerformed || "",
      partsReplaced: row.partsReplaced || "",
      partsCost: numStr(row.partsCost),
      laborCost: numStr(row.laborCost),
      otherCost: numStr(row.otherCost),
      inspectionResult: row.inspectionResult || "",
      serviceProvider: row.serviceProvider || "",
      technician: row.technician || "",
      scheduledDate: dateStr(row.scheduledDate),
      plannedDate: dateStr(row.plannedDate),
    };
  }, []);

  useEffect(() => {
    if ((actionType === "edit" || actionType === "complete") && data) {
      setInitialValues(mapRow(data as IMaintenanceRecord));
    } else if (actionType === "add") {
      setInitialValues(emptyMaintenance);
    }
  }, [actionType, data, mapRow]);

  const handleClose = useCallback(() => dispatch(resetFleetFormModal()), [dispatch]);

  const handleFormSubmit = async (values: IMaintenanceFormValues) => {
    try {
      setLoading(true);
      setError(null);

      if (isCompleteMode && dataId) {
        const payload = {
          workPerformed: values.workPerformed,
          partsReplaced: values.partsReplaced,
          partsCost: nullableNumber(values.partsCost),
          laborCost: nullableNumber(values.laborCost),
          otherCost: nullableNumber(values.otherCost),
          inspectionResult: values.inspectionResult,
          serviceProvider: values.serviceProvider,
          technician: values.technician,
        };
        await completeMaintenance.mutateAsync({ recordId: dataId, body: payload });
        handleClose();
        return;
      }

      const payload = {
        busId: values.busId,
        type: values.type,
        title: values.title,
        priority: values.priority,
        severity: values.severity,
        blocksOperation: values.blocksOperation,
        date: values.date,
        description: values.description,
        mileage: nullableNumber(values.mileage),
        plannedDate: nullableString(values.plannedDate),
        scheduledDate: nullableString(values.scheduledDate),
      };

      if (actionType === "add" && modalType === "maintenance") {
        await createMaintenance.mutateAsync(payload);
      } else if (dataId) {
        await updateMaintenance.mutateAsync({ id: dataId, body: payload });
      }

      handleClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.response?.data?.message || t("transport_form.action_failed"));
    }
  };

  const isFormChanged = (values: IMaintenanceFormValues) =>
    JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    loading,
    error,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    isCompleteMode,
    allBuses: buses,
  };
};

export default useMaintenanceFormFeatures;