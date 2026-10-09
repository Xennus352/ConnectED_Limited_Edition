import { isEqual } from "lodash";
import { useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/useRedux";
import { useRoomService } from "@/services/rooms";
import useRoomValidation from "@/validations/room";
import useRoomFormModalFeatures from "@/components/modals/customs/RoomFormModal/features";
import { toFormikValidationSchema } from "zod-formik-adapter";
import { handleValidationError } from "@/helpers/validation-error";

interface IInitialValues {
  name: string;
  capacity: number;
}

const initialRoomValues: IInitialValues = {
  name: "",
  capacity: 30,
};

const useRoomFormFeatures = () => {
  const { validateRoom } = useRoomValidation();
  const { createRoom, updateRoom, getRoomById } = useRoomService();

  const { handleCloseRoomModal } = useRoomFormModalFeatures();
  const { modalType, actionType } = useAppSelector(
    (state) => state.roomFormModal
  );

  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null,
  });
  const [initialValues, setInitialValues] =
    useState<IInitialValues>(initialRoomValues);

  const { data: roomData, isLoading: isRoomDataLoading } = getRoomById;

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    if (roomData && !isRoomDataLoading) {
      setInitialValues({
        name: roomData.name || "",
        capacity: roomData.capacity || 30,
      });
    } else {
      setInitialValues(initialRoomValues);
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, [roomData, isRoomDataLoading]);

  const handleFormSubmit = async (
    values: IInitialValues,
    { resetForm }: { resetForm: () => void }
  ) => {
    try {
      setState({ loading: true, error: null });

      const payload = {
        ...values,
        capacity: Number(values.capacity),
      };

      if (modalType === "room") {
        const mutation = actionType === "add" ? createRoom : updateRoom;
        await mutation.mutateAsync(payload);
      }

      // Reset form and close modal
      resetForm();
      handleCloseRoomModal();
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

  return {
    loading: state.loading,
    isRoomDataLoading,
    error: state.error,
    handleFormSubmit,
    initialValues,
    isFormChanged,
    validationSchema: toFormikValidationSchema(validateRoom),
  };
};

export default useRoomFormFeatures;