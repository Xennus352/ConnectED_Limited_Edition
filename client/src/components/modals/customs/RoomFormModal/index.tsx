import React from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/hooks/useRedux";
import useRoomFormModalFeatures from "./features";
import { RoomForm } from "@/components/views/list/rooms/customs";
import { DeleteRoom } from "./customs";

const RoomFormModal: React.FC = () => {
  const { t } = useTranslation();
  const { handleCloseRoomModal } = useRoomFormModalFeatures();
  const { modalType, actionType } = useAppSelector(
    (state) => state.roomFormModal
  );

  return (
    <Dialog open={!!modalType} onOpenChange={handleCloseRoomModal}>
      <DialogContent
        className={classNames(
          "overflow-y-auto max-h-screen sm:h-auto rounded-lg",
          {
            "md:min-w-[600px]": actionType !== "delete",
            "w-[90%] max-w-[500px] md:w-fit": actionType === "delete",
          }
        )}
      >
        <DialogHeader>
          <DialogTitle className='capitalize text-xl'>
            {t(`room_form.${actionType}-room`)}
          </DialogTitle>
        </DialogHeader>

        {actionType === "delete" ? <DeleteRoom /> : <RoomForm />}
      </DialogContent>
    </Dialog>
  );
};

export default RoomFormModal;