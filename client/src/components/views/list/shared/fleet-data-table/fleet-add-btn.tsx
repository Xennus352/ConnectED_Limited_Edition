import React from "react";
import { CirclePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  FleetModalType,
  setFleetFormModal,
} from "@/store/slices/fleet-form-modal";
import { CustomTooltip } from "@/tools";
import { useAppDispatch } from "@/hooks/useRedux";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared "add" button for the transport-management tables: opens the
 * fleet form modal in add mode for the given entity.
 */
const FleetAddBtn: React.FC<{
  loading?: boolean;
  entity: FleetModalType;
}> = ({ loading, entity }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleCreate = () => {
    dispatch(
      setFleetFormModal({ modalType: entity, actionType: "add" })
    );
  };

  if (loading) {
    return <Skeleton className='w-9 h-9 rounded-full' />;
  }

  return (
    <CustomTooltip title={t("transport_form.add")}>
      <button disabled={loading} onClick={handleCreate}>
        <CirclePlus className='w-7 md:w-8 h-7 md:h-8 active:scale-95 cursor-pointer' />
      </button>
    </CustomTooltip>
  );
};

export default FleetAddBtn;