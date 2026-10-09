import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";

import useRoomFormFeatures from "./features";
import { useAppSelector } from "@/hooks/useRedux";
import { InputField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/tools";

const RoomForm: React.FC = () => {
  const {
    error,
    loading,
    initialValues,
    isFormChanged,
    handleFormSubmit,
    isRoomDataLoading,
    validationSchema,
  } = useRoomFormFeatures();
  const { t } = useTranslation();
  const { actionType } = useAppSelector((state) => state.roomFormModal);

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={validationSchema}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);

        return (
          <Form className='flex flex-col gap-4' autoComplete='off'>
            <InputField
              type='text'
              name='name'
              label={t("room_form.name")}
              placeholder={t("room_form.enter_name")}
              loading={isRoomDataLoading && actionType === "edit"}
            />

            <InputField
              type='number'
              name='capacity'
              label={t("room_form.capacity")}
              placeholder={t("room_form.enter_capacity")}
              loading={isRoomDataLoading && actionType === "edit"}
            />

            {error && <span className='error mx-auto'>{error}</span>}

            <Button
              type='submit'
              size='sm'
              className={classNames("mt-2", {
                "button-error": !!error,
              })}
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

export default RoomForm;