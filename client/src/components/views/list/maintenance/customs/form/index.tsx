import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";

import useMaintenanceFormFeatures from "./features";
import useTransportValidation from "@/validations/transport";
import {
  InputField,
  SelectField,
  TextareaField,
  DateField,
  CheckboxField,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/tools";
import {
  MAINTENANCE_TYPE_OPTIONS,
  MAINTENANCE_PRIORITY_OPTIONS,
  MAINTENANCE_SEVERITY_OPTIONS,
} from "@/constants/transport";

const INSPECTION_RESULTS = [
  { value: "", label: "—" },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "PARTIAL", label: "Partial" },
];

const MaintenanceForm: React.FC = () => {
  const {
    error,
    loading,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    isCompleteMode,
    allBuses,
  } = useMaintenanceFormFeatures();
  const { t } = useTranslation();
  const { validateMaintenance } = useTransportValidation();

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateMaintenance)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);
        return (
          <Form className='flex flex-col gap-4'>
            {isCompleteMode ? (
              <>
                <TextareaField
                  name='workPerformed'
                  label={t("maintenance_form.workPerformed")}
                  placeholder={t("maintenance_form.enter_workPerformed")}
                  rows={3}
                />
                <TextareaField
                  name='partsReplaced'
                  label={t("maintenance_form.partsReplaced")}
                  placeholder={t("maintenance_form.enter_partsReplaced")}
                  rows={2}
                />
                <div className='grid grid-cols-1 md:grid-cols-3 gap-x-4'>
                  <InputField
                    type='number'
                    name='partsCost'
                    label={t("maintenance_form.partsCost")}
                    placeholder='0'
                  />
                  <InputField
                    type='number'
                    name='laborCost'
                    label={t("maintenance_form.laborCost")}
                    placeholder='0'
                  />
                  <InputField
                    type='number'
                    name='otherCost'
                    label={t("maintenance_form.otherCost")}
                    placeholder='0'
                  />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
                  <SelectField
                    name='inspectionResult'
                    label={t("maintenance_form.inspectionResult")}
                    options={INSPECTION_RESULTS}
                    placeholder='—'
                    value={props.values.inspectionResult}
                  />
                  <InputField
                    type='text'
                    name='serviceProvider'
                    label={t("maintenance_form.serviceProvider")}
                    placeholder={t("maintenance_form.enter_serviceProvider")}
                  />
                </div>
                <InputField
                  type='text'
                  name='technician'
                  label={t("maintenance_form.technician")}
                  placeholder={t("maintenance_form.enter_technician")}
                />
              </>
            ) : (
              <>
                <SelectField
                  name='busId'
                  label={t("maintenance_form.bus")}
                  options={[
                    { value: "", label: t("maintenance_form.select_bus") },
                    ...allBuses.map((bus: any) => ({
                      value: bus._id || bus.id,
                      label: `${bus.busNumber}${bus.name ? ` · ${bus.name}` : ""}`,
                    })),
                  ]}
                  placeholder={t("maintenance_form.select_bus")}
                  value={props.values.busId}
                />
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
                  <SelectField
                    name='type'
                    label={t("maintenance_form.type")}
                    options={MAINTENANCE_TYPE_OPTIONS}
                    placeholder={t("maintenance_form.select_type")}
                    value={props.values.type}
                  />
                  <InputField
                    type='text'
                    name='title'
                    label={t("maintenance_form.title")}
                    placeholder={t("maintenance_form.enter_title")}
                  />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
                  <SelectField
                    name='priority'
                    label={t("maintenance_form.priority")}
                    options={MAINTENANCE_PRIORITY_OPTIONS}
                    placeholder={t("maintenance_form.select_priority")}
                    value={props.values.priority}
                  />
                  <SelectField
                    name='severity'
                    label={t("maintenance_form.severity")}
                    options={MAINTENANCE_SEVERITY_OPTIONS}
                    placeholder={t("maintenance_form.select_severity")}
                    value={props.values.severity}
                  />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
                  <DateField name='date' label={t("maintenance_form.date")} />
                  <DateField
                    name='plannedDate'
                    label={t("maintenance_form.plannedDate")}
                  />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
                  <DateField
                    name='scheduledDate'
                    label={t("maintenance_form.scheduledDate")}
                  />
                  <InputField
                    type='number'
                    name='mileage'
                    label={t("maintenance_form.mileage")}
                    placeholder='0'
                  />
                </div>
                <CheckboxField
                  name='blocksOperation'
                  label={t("maintenance_form.blocksOperation")}
                />
                <TextareaField
                  name='description'
                  label={t("maintenance_form.description")}
                  placeholder={t("maintenance_form.enter_description")}
                  rows={3}
                />
              </>
            )}

            {error && <span className='error mx-auto'>{error}</span>}

            <Button
              type='submit'
              size='sm'
              className={classNames("mt-2", { "button-error": !!error })}
              disabled={loading || (actionType === "edit" && !formChanged)}
            >
              {loading ? (
                <LoadingSpinner />
              ) : isCompleteMode ? (
                t("maintenance_form.complete_ticket")
              ) : actionType === "edit" ? (
                t("button.update")
              ) : (
                t("button.submit")
              )}
            </Button>
          </Form>
        );
      }}
    </Formik>
  );
};

export default MaintenanceForm;