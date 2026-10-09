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
import useFleetFormModalFeatures from "./features";
import FleetDeleteConfirm from "./delete-confirm";
import { BusForm } from "@/components/views/list/buses/customs";
import { RouteForm } from "@/components/views/list/routes/customs";
import { TripForm } from "@/components/views/list/trips/customs";
import { MaintenanceForm } from "@/components/views/list/maintenance/customs";
import { FuelForm } from "@/components/views/list/fuel/customs";
import { IncidentForm } from "@/components/views/list/incidents/customs";

/**
 * Shared modal for the transport-management modules. `modalType` chooses the
 * rendered form; "delete" renders the shared confirmation, "complete" opens
 * the maintenance completion form which records the return-to-service data.
 */
const FleetFormModal: React.FC = () => {
  const { t } = useTranslation();
  const { handleCloseFleetModal } = useFleetFormModalFeatures();
  const { modalType, actionType, dataId } = useAppSelector(
    (state) => state.fleetFormModal
  );

  const open = !!modalType;
  const isDelete = actionType === "delete";

  return (
    <Dialog open={open} onOpenChange={handleCloseFleetModal}>
      <DialogContent
        className={classNames(
          "overflow-y-auto max-h-screen sm:h-auto rounded-lg",
          {
            "md:min-w-[600px]": !isDelete,
            "w-[90%] max-w-[500px] md:w-fit": isDelete,
          }
        )}
      >
        <DialogHeader>
          <DialogTitle className='capitalize text-xl'>
            {t(`transport_form.${actionType ?? "add"}-${modalType ?? "record"}`)}
          </DialogTitle>
        </DialogHeader>

        {isDelete ? (
          <FleetDeleteConfirm entity={modalType!} dataId={dataId} />
        ) : (
          (() => {
            switch (modalType) {
              case "bus":
                return <BusForm />;
              case "route":
                return <RouteForm />;
              case "trip":
                return <TripForm />;
              case "maintenance":
                return <MaintenanceForm />;
              case "fuel":
                return <FuelForm />;
              case "incident":
                return <IncidentForm />;
              default:
                return null;
            }
          })()
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FleetFormModal;