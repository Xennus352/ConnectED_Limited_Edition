import { useParams } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useRedux";
import { setUserFormModal } from "@/store/slices/user-form-modal";

const useDriverProfileFeatures = () => {
  const params = useParams();
  const dispatch = useAppDispatch();

  const handleEditDriver = () => {
    dispatch(
      setUserFormModal({
        modalType: "driver",
        actionType: "edit",
        dataId: params?.driverId,
      })
    );
  };

  const handleDeleteDriver = () => {
    dispatch(
      setUserFormModal({
        modalType: "driver",
        actionType: "delete",
        dataId: params?.driverId,
      })
    );
  };

  return { handleEditDriver, handleDeleteDriver };
};

export default useDriverProfileFeatures;