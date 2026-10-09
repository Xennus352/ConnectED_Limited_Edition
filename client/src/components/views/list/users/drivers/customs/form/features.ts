import { isEqual } from "lodash";
import { useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { IBus } from "@/interfaces/bus";
import { useAppSelector } from "@/hooks/useRedux";
import { useDriverService } from "@/services/users/drivers";
import { useFleetService } from "@/services/fleet";
import { idOf } from "@/helpers";
import { handleValidationError } from "@/helpers/validation-error";
import useUserFormModalFeatures from "@/components/modals/customs/UserFormModal/features";

interface IInitialValues {
  fullName: string;
  username: string;
  password: string;
  phoneNumber: string;
  gender: "male" | "female" | "";
  birthday: Date | null;
  address: string;
  profilePhoto: string;
  email?: string;
  status: string;
  bus: string;
}

const initialDriverValues: IInitialValues = {
  fullName: "",
  username: "",
  password: "",
  phoneNumber: "",
  gender: "",
  birthday: null,
  address: "",
  profilePhoto: "",
  email: "",
  status: "active",
  bus: "",
};

const useDriversFormFeatures = () => {
  const { getAllBusesUnpaginated } = useFleetService();
  const { createDriver, getDriverById, updateDriver } = useDriverService();
  const { handleCloseUserModal } = useUserFormModalFeatures();
  const { modalType, actionType, dataId } = useAppSelector(
    (state) => state.userFormModal
  );

  // state
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null,
  });
  const [initialValues, setInitialValues] =
    useState<IInitialValues>(initialDriverValues);

  const { data: driverData, isLoading: isDriverDataLoading } = getDriverById;

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    if (driverData && !isDriverDataLoading) {
      setInitialValues({
        fullName: driverData.fullName || "",
        username: driverData.username || "",
        password: driverData.password || "",
        phoneNumber: driverData.phoneNumber || "",
        gender: driverData.gender || "",
        birthday: driverData.birthday || null,
        address: driverData.address || "",
        profilePhoto: driverData.profilePhoto || "",
        email: driverData.email || "",
        status: driverData.status || "active",
        bus: idOf(driverData.bus),
      });
    } else {
      setInitialValues(initialDriverValues);
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, [driverData, isDriverDataLoading]);

  const handleFormSubmit = async (
    values: IInitialValues,
    { resetForm }: { resetForm: () => void }
  ) => {
    try {
      setState({ loading: true, error: null });

      const payload = { ...values };
      if (!values.email) delete payload.email; // Exclude email if empty

      if (values.email) payload.email = values.email;

      if (modalType === "driver") {
        const mutation = actionType === "add" ? createDriver : updateDriver;
        await mutation.mutateAsync(payload);
      }

      // Reset form and close modal
      resetForm();
      handleCloseUserModal();
    } catch (error: any) {
      // Enhanced error handling
      let errorMessage = "Something went wrong. Please try again later!";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && "response" in error && error.response?.data?.errors) {
        errorMessage = error.response.data.errors;
      }

      setState({ loading: false, error: errorMessage });
      handleValidationError(error);
      toast({ title: errorMessage });
    } finally {
      setState((prevState) => ({ ...prevState, loading: false }));
    }
  };

  // Compute whether form values are changed
  const isFormChanged = (values: IInitialValues): boolean => {
    return !isEqual(values, initialValues);
  };

  const { data: busesData, isLoading: isBusesDataLoading } =
    getAllBusesUnpaginated;

  const busOptions = busesData
    ?.filter((item: IBus) => {
      if (actionType === "add") {
        // Exclude buses that already have a driver
        return !item.driver?._id;
      } else if (actionType === "edit") {
        // Include the driver's current bus or any unassigned bus
        return item.driver?._id === dataId || !item.driver?._id;
      }
      return false;
    })
    ?.map(({ _id, busNumber }: IBus) => ({
      value: _id,
      label: busNumber,
    }));

  return {
    loading: state.loading,
    error: state.error,
    isDriverDataLoading,
    handleFormSubmit,
    initialValues,
    isFormChanged,
    busOptions,
    isBusesDataLoading,
  };
};

export default useDriversFormFeatures;