import React from "react";
import { CirclePlus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CustomTooltip } from "@/tools";
import { useAppDispatch } from "@/hooks/useRedux";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomModalType, setRoomFormModal } from "@/store/slices/room-form-modal";

type TPath = "/list/rooms";

const pathToModalType: Record<TPath, string> = {
  "/list/rooms": "room",
};

const AddBtn: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const handleCreate = () => {
    if (location.pathname in pathToModalType) {
      const modalType =
        pathToModalType[location.pathname as keyof typeof pathToModalType];

      dispatch(
        setRoomFormModal({
          modalType: modalType as RoomModalType,
          actionType: "add",
        })
      );
    }
  };

  if (loading) {
    return <Skeleton className="w-9 h-9 rounded-full" />;
  }

  return (
    <CustomTooltip title={t("room_form.add-room")}>
      <button disabled={loading} onClick={handleCreate}>
        <CirclePlus
          className='w-7 md:w-8 h-7 md:h-8 active:scale-95 cursor-pointer'
        />
      </button>
    </CustomTooltip>
  );
};

export default AddBtn;