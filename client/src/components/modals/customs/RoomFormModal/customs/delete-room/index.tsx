import React from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

import useDeleteRoomFeatures from "./features";
import { Button } from "@/components/ui/button";
import { useRoomService } from "@/services/rooms";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";

const DeleteRoom: React.FC = () => {
  const { t } = useTranslation();
  const { getRoomById } = useRoomService();
  const { handleCloseRoomModal, handleDeleteRoom } = useDeleteRoomFeatures();

  const { data, isLoading } = getRoomById;

  return (
    <div className='flex flex-col gap-4'>
      <div className='text-center'>
        <h4 className='text-[16px] font-bold capitalize'>{data?.name}</h4>
      </div>

      <DialogDescription className={classNames("max-w-[400px] text-center")}>
        {t("room_form.delete_description")}
      </DialogDescription>

      <DialogFooter className='flex flex-col md:flex-row gap-2 md:gap-0'>
        <Button variant='outline' onClick={handleCloseRoomModal}>
          {t("button.cancel")}
        </Button>
        <Button
          variant='destructive'
          onClick={handleDeleteRoom}
          disabled={isLoading}
        >
          {t("button.delete")}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default DeleteRoom;