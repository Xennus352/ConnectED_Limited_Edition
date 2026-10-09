import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";
import { Plus, Trash2 } from "lucide-react";

import useRouteFormFeatures from "./features";
import useTransportValidation from "@/validations/transport";
import { InputField, TextareaField, CheckboxField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/tools";

const RouteForm: React.FC = () => {
  const {
    error,
    loading,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    actionType,
    stops,
    addStop,
    updateStop,
    removeStop,
  } = useRouteFormFeatures();
  const { t } = useTranslation();
  const { validateRoute } = useTransportValidation();

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateRoute)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);
        return (
          <Form className='flex flex-col gap-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1'>
              <InputField
                type='text'
                name='name'
                label={t("route_form.name")}
                placeholder={t("route_form.enter_name")}
              />
              <InputField
                type='text'
                name='startLocation'
                label={t("route_form.startLocation")}
                placeholder={t("route_form.enter_startLocation")}
              />
              <InputField
                type='text'
                name='endLocation'
                label={t("route_form.endLocation")}
                placeholder={t("route_form.enter_endLocation")}
              />
              <InputField
                type='number'
                name='estimatedDuration'
                label={t("route_form.estimatedDuration")}
                placeholder='min'
              />
            </div>

            <div className='md:col-span-2'>
              <TextareaField
                name='description'
                label={t("route_form.description")}
                placeholder={t("route_form.enter_description")}
                rows={3}
              />
            </div>

            <CheckboxField
              name='isActive'
              label={t("route_form.isActive")}
            />

            {/* Ordered stop editor — synced to RouteStop documents. */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-base font-normal'>
                  {t("route_form.stops")}
                </Label>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={addStop}
                  className='gap-1'
                >
                  <Plus className='h-3.5 w-3.5' /> {t("route_form.add_stop")}
                </Button>
              </div>

              {stops.length === 0 && (
                <p className='text-sm text-muted-foreground'>
                  {t("route_form.no_stops")}
                </p>
              )}

              {stops.map((stop, index) => (
                <div key={index} className='flex items-center gap-2'>
                  <span className='w-6 text-sm text-muted-foreground'>
                    #{index + 1}
                  </span>
                  <Input
                    value={stop.name}
                    placeholder={t("route_form.stop_name")}
                    onChange={(event) =>
                      updateStop(index, { name: event.target.value })
                    }
                    className='flex-1'
                  />
                  <Input
                    type='number'
                    value={stop.estimatedArrival ?? ""}
                    placeholder={t("route_form.stop_arrival")}
                    onChange={(event) =>
                      updateStop(index, {
                        estimatedArrival: event.target.value,
                      })
                    }
                    className='w-24'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-rose-600'
                    onClick={() => removeStop(index)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>

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

export default RouteForm;