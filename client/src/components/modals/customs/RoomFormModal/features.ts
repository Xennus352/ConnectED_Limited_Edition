import { useSearchParams } from "react-router-dom";

import { useAppDispatch } from "@/hooks/useRedux";
import { resetRoomFormModal } from "@/store/slices/room-form-modal";

const useRoomFormModalFeatures = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCloseRoomModal = () => {
    dispatch(resetRoomFormModal());

    searchParams.delete("roomId");
    setSearchParams(searchParams);
  };

  return {
    handleCloseRoomModal,
  };
};

export default useRoomFormModalFeatures;