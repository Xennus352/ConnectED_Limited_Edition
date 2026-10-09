import { useNavigate } from "react-router-dom";

import useRoomFormModalFeatures from "../../features";
import { useRoomService } from "@/services/rooms";
import { useAppSelector } from "@/hooks/useRedux";

const useDeleteRoomFeatures = () => {
  const navigate = useNavigate();
  const { modalType, actionType, dataId } = useAppSelector(
    (state) => state.roomFormModal
  );
  const { handleCloseRoomModal } = useRoomFormModalFeatures();

  const { deleteRoom } = useRoomService();

  const handleDeleteRoom = async () => {
    if (!dataId || actionType !== "delete" || !modalType) return;

    await deleteRoom.mutateAsync();
    navigate(`/list/rooms`);
    handleCloseRoomModal();
  };

  return { handleDeleteRoom, handleCloseRoomModal };
};

export default useDeleteRoomFeatures;