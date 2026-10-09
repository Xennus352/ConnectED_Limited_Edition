import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";

import useIncidentFormFeatures from "./features";
import useTransportValidation from "@/validations/transport";
import {
  SelectField,
  TextareaField,
  DateTimePickerField,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/tools";
import {
  INCIDENT_TYPE_OPTIONS,
  INCIDENT_SEVERITY_OPTIONS,
} from "@/constants/transport";

const IncidentForm: React.FC = () => {
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
    allTrips,
  } = useIncidentFormFeatures();
  const { t } = useTranslation();
  const { validateIncident } = useTransportValidation();

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateIncident)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);
        return (
          <Form className='flex flex-col gap-4'>
            <SelectField
              name='busId'
              label={t("incident_form.bus")}
              options={[
                { value: "", label: t("incident_form.select_bus") },
                ...allBuses.map((bus: any) => ({
                  value: bus._id || bus.id,
                  label: bus.busNumber,
                })),
              ]}
              placeholder={t("incident_form.select_bus")}
              value={props.values.busId}
            />
            <SelectField
              name='driverId'
              label={t("incident_form.driver")}
              options={[
                { value: "", label: t("incident_form.select_driver") },
                ...allDrivers.map((driver: any) => ({
                  value: driver._id || driver.id,
                  label: driver.fullName || driver.username,
                })),
              ]}
              placeholder={t("incident_form.select_driver")}
              value={props.values.driverId}
            />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4'>
              <SelectField
                name='type'
                label={t("incident_form.type")}
                options={INCIDENT_TYPE_OPTIONS}
                placeholder={t("incident_form.select_type")}
                value={props.values.type}
              />
              <SelectField
                name='severity'
                label={t("incident_form.severity")}
                options={INCIDENT_SEVERITY_OPTIONS}
                placeholder={t("incident_form.select_severity")}
                value={props.values.severity}
              />
            </div>
            <SelectField
              name='tripId'
              label={t("incident_form.trip")}
              options={[
                { value: "", label: t("incident_form.no_trip") },
                ...allTrips
                  .slice(0, 100)
                  .map((trip: any) => ({
                    value: trip._id || trip.id,
                    label: `${trip.tripType || "Trip"} · ${trip.bus?.busNumber || "—"} · ${trip.status || ""}`,
                  })),
              ]}
              placeholder={t("incident_form.select_trip")}
              value={props.values.tripId}
            />
            <SelectField
              name='routeId'
              label={t("incident_form.route")}
              options={[
                { value: "", label: t("incident_form.no_route") },
                ...allRoutes.map((route: any) => ({
                  value: route._id || route.id,
                  label: route.name,
                })),
              ]}
              placeholder={t("incident_form.select_route")}
              value={props.values.routeId}
            />
            <DateTimePickerField
              name='occurredAt'
              label={t("incident_form.occurredAt")}
            />
            <TextareaField
              name='description'
              label={t("incident_form.description")}
              placeholder={t("incident_form.enter_description")}
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

export default IncidentForm;