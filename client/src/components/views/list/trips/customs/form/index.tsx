import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";

import useTripFormFeatures from "./features";
import useTransportValidation from "@/validations/transport";
import { InputField, SelectField, DateTimePickerField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/tools";
import { TRIP_TYPE_OPTIONS } from "@/constants/transport";

const TripForm: React.FC = () => {
  const {
    error,
    loading,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    allBuses,
    allDrivers,
    allRoutes,
  } = useTripFormFeatures();
  const { t } = useTranslation();
  const { validateTrip } = useTransportValidation();

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateTrip)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);
        return (
          <Form className='flex flex-col gap-4'>
            <SelectField
              name='tripType'
              label={t("trip_form.tripType")}
              options={TRIP_TYPE_OPTIONS}
              placeholder={t("trip_form.select_tripType")}
              value={props.values.tripType}
            />
            <SelectField
              name='busId'
              label={t("trip_form.bus")}
              options={[
                { value: "", label: t("trip_form.select_bus") },
                ...allBuses.map((bus: any) => ({
                  value: bus._id || bus.id,
                  label: `${bus.busNumber}${bus.name ? ` · ${bus.name}` : ""}`,
                })),
              ]}
              placeholder={t("trip_form.select_bus")}
              value={props.values.busId}
            />
            <SelectField
              name='driverId'
              label={t("trip_form.driver")}
              options={[
                { value: "", label: t("trip_form.select_driver") },
                ...allDrivers.map((driver: any) => ({
                  value: driver._id || driver.id,
                  label: driver.fullName || driver.username,
                })),
              ]}
              placeholder={t("trip_form.select_driver")}
              value={props.values.driverId}
            />
            <SelectField
              name='routeId'
              label={t("trip_form.route")}
              options={[
                { value: "", label: t("trip_form.select_route") },
                ...allRoutes.map((route: any) => ({
                  value: route._id || route.id,
                  label: route.name,
                })),
              ]}
              placeholder={t("trip_form.select_route")}
              value={props.values.routeId}
            />
            <DateTimePickerField
              name='scheduledStartAt'
              label={t("trip_form.scheduledStartAt")}
            />
            <DateTimePickerField
              name='scheduledEndAt'
              label={t("trip_form.scheduledEndAt")}
            />
            <InputField
              type='text'
              name='notes'
              label={t("trip_form.notes")}
              placeholder={t("trip_form.enter_notes")}
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

export default TripForm;