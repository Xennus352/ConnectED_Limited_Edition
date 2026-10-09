import React from "react";
import classNames from "classnames";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { toFormikValidationSchema } from "zod-formik-adapter";

import {
  DateField,
  InputField,
  SelectField,
  UploadImageField,
} from "@/components/form";
import { LoadingSpinner } from "@/tools";
import useDriversFormFeatures from "./features";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks/useRedux";
import FormSubtitle from "@/components/form/subtitle";
import { useUserValidation } from "@/validations/users";
import useMockData from "@/utils";

const DriversForm: React.FC = () => {
  const {
    loading,
    error,
    initialValues,
    handleFormSubmit,
    isDriverDataLoading,
    isFormChanged,
    busOptions,
    isBusesDataLoading,
  } = useDriversFormFeatures();
  const { t } = useTranslation();
  const { validateDriver } = useUserValidation();
  const { driver_status_options } = useMockData();
  const { actionType } = useAppSelector((state) => state.userFormModal);

  return (
    <Formik
      enableReinitialize
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validateDriver)}
    >
      {(props: any) => {
        const formChanged = isFormChanged(props.values);

        return (
          <Form className='flex flex-col gap-4' autoComplete='true'>
            <FormSubtitle>{t("user_form.user_login_info")}</FormSubtitle>

            <div className='grid md:grid-cols-2 gap-4'>
              <InputField
                type='text'
                name='username'
                label={t("user_form.username")}
                placeholder={t("user_form.enter_your_username")}
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <InputField
                type='password'
                name='password'
                label={t("user_form.password")}
                placeholder={t("user_form.enter_your_password")}
                loading={isDriverDataLoading && actionType === "edit"}
              />
            </div>

            <FormSubtitle>{t("user_form.user_info")}</FormSubtitle>

            <div className='grid md:grid-cols-2 gap-4'>
              <InputField
                type='text'
                name='fullName'
                label={t("user_form.fullName")}
                placeholder={t("user_form.enter_your_fullName")}
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <InputField
                type='text'
                name='phoneNumber'
                label={t("user_form.phoneNumber") + " (+9594)"}
                placeholder={t("user_form.enter_your_phoneNumber")}
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <InputField
                type='email'
                name='email'
                label={t("user_form.email")}
                placeholder={t("user_form.enter_your_email")}
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <SelectField
                name='gender'
                label={t("user_form.gender")}
                value={props.values.gender}
                options={[
                  { label: t("user_form.male"), value: "male" },
                  { label: t("user_form.female"), value: "female" },
                ]}
                placeholder={t("user_form.select_your_gender")}
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <DateField
                name='birthday'
                label={t("user_form.birthday")}
                placeholder={t("user_form.enter_your_birthday")}
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <InputField
                type='text'
                name='address'
                label={t("user_form.address")}
                placeholder='Chan Mya Tharsi St, Taungoo, Bago Region'
                loading={isDriverDataLoading && actionType === "edit"}
              />

              <SelectField
                name='bus'
                label={t("user_form.bus")}
                options={busOptions}
                placeholder={t("user_form.select_bus")}
                value={props.values.bus}
                loading={isBusesDataLoading && actionType === "edit"}
              />
            </div>

            <SelectField
              name='status'
              label={t("user_form.status")}
              options={driver_status_options}
              placeholder={t("user_form.select_status")}
              value={props.values.status}
              loading={isDriverDataLoading && actionType === "edit"}
            />

            <UploadImageField
              name='profilePhoto'
              label={t("user_form.profilePhoto")}
              loading={isDriverDataLoading && actionType === "edit"}
            />

            {props.touched.fullName ||
              props.touched.username ||
              props.touched.password ||
              props.touched.phoneNumber ||
              props.touched.gender ||
              props.touched.birthday ||
              props.touched.address ||
              props.touched.bus ||
              props.touched.profilePhoto ||
              props.touched.email ||
              (error && <span className='error mx-auto'>{error}</span>)}

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

export default DriversForm;