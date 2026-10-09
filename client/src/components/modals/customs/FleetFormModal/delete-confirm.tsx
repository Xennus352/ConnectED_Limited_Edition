import React from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import useFleetFormModalFeatures, { useFleetDelete } from "./features";
import { FleetModalType } from "@/store/slices/fleet-form-modal";
import { LoadingSpinner } from "@/tools";

interface IFleetDeleteConfirmProps {
  entity: FleetModalType;
  dataId: string | null;
}

/** Per-entity confirmation copy. */
const DESCRIPTIONS: Record<FleetModalType, string> = {
  bus: "bus_form.delete_bus_message",
  route: "route_form.delete_route_message",
  trip: "trip_form.delete_trip_message",
  maintenance: "maintenance_form.delete_record_message",
  fuel: "fuel_form.delete_record_message",
  incident: "incident_form.delete_record_message",
};

const FleetDeleteConfirm: React.FC<IFleetDeleteConfirmProps> = ({
  entity,
  dataId,
}) => {
  const { t } = useTranslation();
  const { handleCloseFleetModal } = useFleetFormModalFeatures();
  const { runDelete, deleting } = useFleetDelete(entity);

  const handleDelete = async () => {
    if (!dataId) return;
    await runDelete(dataId);
    handleCloseFleetModal();
  };

  return (
    <div className='flex flex-col gap-4'>
      <DialogDescription className={classNames("max-w-[400px] text-center")}>
        {t(DESCRIPTIONS[entity])}
      </DialogDescription>

      <DialogFooter className='flex flex-col md:flex-row gap-2 md:gap-0'>
        <Button variant='outline' onClick={handleCloseFleetModal}>
          {t("button.cancel")}
        </Button>
        <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
          {deleting ? <LoadingSpinner /> : t("button.delete")}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default FleetDeleteConfirm;