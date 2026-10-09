import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";

import useFuelFormFeatures from "./features";
import useTransportValidation from "@/validations/transport";
import { InputField, SelectField, TextareaField, DateField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/tools";

const FuelForm: React.FC = () => {
  const {
    error,
    loading,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    allBuses,
    allDrivers,
  } = useFuelFormFeatures();
  const { t } = useTranslation();
  const { validateFuel } = useTransportValidation();

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateFuel)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);
        return (
          <Form className='flex flex-col gap-4'>
            <SelectField
              name='busId'
              label={t("fuel_form.bus")}
              options={[
                { value: "", label: t("fuel_form.select_bus") },
                ...allBuses.map((bus: any) => ({
                  value: bus._id || bus.id,
                  label: `${bus.busNumber}${bus.name ? ` · ${bus.name}` : ""}`,
                })),
              ]}
              placeholder={t("fuel_form.select_bus")}
              value={props.values.busId}
            />
            <SelectField
              name='driverId'
              label={t("fuel_form.driver")}
              options={[
                { value: "", label: t("fuel_form.select_driver") },
                ...allDrivers.map((driver: any) => ({
                  value: driver._id || driver.id,
                  label: driver.fullName || driver.username,
                })),
              ]}
              placeholder={t("fuel_form.select_driver")}
              value={props.values.driverId}
            />
            <DateField name='date' label={t("fuel_form.date")} />
            <InputField
              type='number'
              name='liters'
              label={t("fuel_form.liters")}
              placeholder='0'
            />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
              <InputField
                type='number'
                name='pricePerLiter'
                label={t("fuel_form.pricePerLiter")}
                placeholder='0'
              />
              <InputField
                type='number'
                name='totalCost'
                label={t("fuel_form.totalCost")}
                placeholder='0'
              />
            </div>
            <InputField
              type='text'
              name='station'
              label={t("fuel_form.station")}
              placeholder={t("fuel_form.enter_station")}
            />
            <TextareaField
              name='notes'
              label={t("fuel_form.notes")}
              placeholder={t("fuel_form.enter_notes")}
              rows={3}
            />

            {error && <span className='error mx-auto'>{error}</span>}

            <Button
              type='submit'
              size='sm'
              className={classNames("mt-2", { "button-error": !!error })}
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
          </Form>
        );
      }}
    </Formik>
  );
};

export default FuelForm;