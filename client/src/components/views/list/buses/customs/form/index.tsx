import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";

import useBusFormFeatures from "./features";
import useTransportValidation from "@/validations/transport";
import {
  InputField,
  SelectField,
  TextareaField,
  DateField,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/tools";
import {
  BUS_STATUS_OPTIONS,
  BUS_VEHICLE_TYPE_OPTIONS,
  BUS_FUEL_TYPE_OPTIONS,
} from "@/constants/transport";

const BusForm: React.FC = () => {
  const {
    error,
    loading,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    allDrivers,
    allRoutes,
  } = useBusFormFeatures();
  const { t } = useTranslation();
  const { validateBus } = useTransportValidation();

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateBus)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);
        return (
          <Form className='grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1'>
            <InputField
              type='text'
              name='busNumber'
              label={t("bus_form.busNumber")}
              placeholder={t("bus_form.enter_busNumber")}
            />
            <InputField
              type='text'
              name='registrationNumber'
              label={t("bus_form.registrationNumber")}
              placeholder={t("bus_form.enter_registrationNumber")}
            />
            <InputField
              type='text'
              name='name'
              label={t("bus_form.name")}
              placeholder={t("bus_form.enter_name")}
            />
            <InputField
              type='number'
              name='capacity'
              label={t("bus_form.capacity")}
              placeholder='30'
            />
            <InputField
              type='text'
              name='make'
              label={t("bus_form.make")}
              placeholder={t("bus_form.enter_make")}
            />
            <InputField
              type='text'
              name='model'
              label={t("bus_form.model")}
              placeholder={t("bus_form.enter_model")}
            />
            <InputField
              type='number'
              name='year'
              label={t("bus_form.year")}
              placeholder='2020'
            />
            <InputField
              type='text'
              name='color'
              label={t("bus_form.color")}
              placeholder={t("bus_form.enter_color")}
            />
            <SelectField
              name='vehicleType'
              label={t("bus_form.vehicleType")}
              options={BUS_VEHICLE_TYPE_OPTIONS}
              placeholder={t("bus_form.select_vehicleType")}
              value={props.values.vehicleType}
            />
            <SelectField
              name='fuelType'
              label={t("bus_form.fuelType")}
              options={BUS_FUEL_TYPE_OPTIONS}
              placeholder={t("bus_form.select_fuelType")}
              value={props.values.fuelType}
            />
            <InputField
              type='number'
              name='fuelConsumption'
              label={t("bus_form.fuelConsumption")}
              placeholder='L / 100km'
            />
            <InputField
              type='number'
              name='mileage'
              label={t("bus_form.mileage")}
              placeholder='0'
            />
            <InputField
              type='number'
              name='purchasePrice'
              label={t("bus_form.purchasePrice")}
              placeholder='0'
            />
            <SelectField
              name='status'
              label={t("bus_form.status")}
              options={BUS_STATUS_OPTIONS}
              placeholder={t("bus_form.select_status")}
              value={props.values.status}
            />
            <SelectField
              name='driverId'
              label={t("bus_form.driver")}
              options={[
                { value: "", label: t("bus_form.no_driver") },
                ...allDrivers.map((d: any) => ({
                  value: d._id || d.id,
                  label: d.fullName || d.username,
                })),
              ]}
              placeholder={t("bus_form.select_driver")}
              value={props.values.driverId}
            />
            <SelectField
              name='routeId'
              label={t("bus_form.route")}
              options={[
                { value: "", label: t("bus_form.no_route") },
                ...allRoutes.map((r: any) => ({
                  value: r._id || r.id,
                  label: r.name,
                })),
              ]}
              placeholder={t("bus_form.select_route")}
              value={props.values.routeId}
            />
            <div className='md:col-span-2'>
              <DateField
                name='purchaseDate'
                label={t("bus_form.purchaseDate")}
              />
            </div>
            <div className='md:col-span-2'>
              <DateField
                name='insuranceExpiresAt'
                label={t("bus_form.insuranceExpiresAt")}
              />
            </div>
            <div className='md:col-span-2'>
              <DateField
                name='nextInspectionDueAt'
                label={t("bus_form.nextInspectionDueAt")}
              />
            </div>
            <div className='md:col-span-2'>
              <DateField
                name='registrationExpiresAt'
                label={t("bus_form.registrationExpiresAt")}
              />
            </div>
            <div className='md:col-span-2'>
              <InputField
                type='text'
                name='insuranceProvider'
                label={t("bus_form.insuranceProvider")}
                placeholder={t("bus_form.enter_insuranceProvider")}
              />
            </div>
            <div className='md:col-span-2'>
              <InputField
                type='text'
                name='insurancePolicyNumber'
                label={t("bus_form.insurancePolicyNumber")}
                placeholder={t("bus_form.enter_insurancePolicyNumber")}
              />
            </div>
            <div className='md:col-span-2'>
              <TextareaField
                name='notes'
                label={t("bus_form.notes")}
                placeholder={t("bus_form.enter_notes")}
                rows={3}
              />
            </div>

            <div className='md:col-span-2'>
              {error && <span className='error mx-auto'>{error}</span>}
              <Button
                type='submit'
                size='sm'
                className={classNames("mt-2 w-full", { "button-error": !!error })}
                disabled={loading || (actionType === "edit" && !formChanged)}
              >
                {loading ? (
                  <LoadingSpinner />
                ) : actionType === "edit" ? (
                  t("button.update")
                ) : (
                  t("button.submit")
                )}
              </Button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default BusForm;