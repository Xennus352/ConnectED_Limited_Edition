import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  CircleX,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useTripsService } from "@/services/transport";
import { ITrip } from "@/interfaces/transport";
import FleetRowActions from "@/components/views/list/shared/fleet-row-actions";
import { StatusBadge, DateText } from "@/components/views/list/shared/fleet-badges";

const useTripColumns = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { runWorkflow } = useTripsService();

  const columns: ColumnDef<ITrip>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "tripType",
      header: ({ column }) => (
        <ColumnHeader column={column} title='trips_tripType' />
      ),
      cell: ({ row }) => (
        <div className='font-medium capitalize'>{row.original.tripType}</div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <ColumnHeader column={column} title='trips_status' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "bus",
      header: ({ column }) => <ColumnHeader column={column} title='trips_bus' />,
      cell: ({ row }) => (
        <div>{row.original.bus?.busNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "driver",
      header: ({ column }) => (
        <ColumnHeader column={column} title='trips_driver' />
      ),
      cell: ({ row }) => (
        <div>{row.original.driver?.fullName || "—"}</div>
      ),
    },
    {
      accessorKey: "route",
      header: ({ column }) => <ColumnHeader column={column} title='trips_route' />,
      cell: ({ row }) => (
        <div>{row.original.route?.name || "—"}</div>
      ),
    },
    {
      accessorKey: "scheduledStartAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title='trips_scheduledStartAt' />
      ),
      cell: ({ row }) => <DateText value={row.original.scheduledStartAt} />,
    },
    {
      accessorKey: "actualStartAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title='trips_actualStartAt' />
      ),
      cell: ({ row }) => <DateText value={row.original.actualStartAt} />,
    },
    {
      accessorKey: "distanceKm",
      header: ({ column }) => (
        <ColumnHeader column={column} title='trips_distanceKm' />
      ),
      cell: ({ row }) => (
        <div className='tabular-nums'>
          {row.original.distanceKm !== null && row.original.distanceKm !== undefined
            ? `${row.original.distanceKm.toFixed(1)} km`
            : "—"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => {
        const trip = row.original;
        const status = trip.status;
        const items = [];

        if (status === "SCHEDULED") {
          items.push({
            label: t("trip_form.mark_ready"),
            icon: CalendarCheck,
            onClick: () => runWorkflow.mutateAsync({ tripId: trip._id, action: "ready" }),
          });
        }
        if (["SCHEDULED", "READY", "DELAYED"].includes(status)) {
          items.push({
            label: t("trip_form.cancel_trip"),
            icon: CircleX,
            destructive: true,
            onClick: () => runWorkflow.mutateAsync({ tripId: trip._id, action: "cancel" }),
          });
        }
        if (status === "SCHEDULED" || status === "READY") {
          items.push({
            label: t("trip_form.edit_trip"),
            icon: Pencil,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "trip",
                  actionType: "edit",
                  dataId: trip._id,
                  data: trip as any,
                })
              ),
          });
        }
        if (["SCHEDULED", "READY", "DELAYED"].includes(status)) {
          items.push({
            label: t("trip_form.delete_trip"),
            icon: Trash2,
            destructive: true,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "trip",
                  actionType: "delete",
                  dataId: trip._id,
                  data: trip as any,
                })
              ),
          });
        }

        return <FleetRowActions items={items} empty={items.length === 0} />;
      },
    },
  ];

  return { columns };
};

export default useTripColumns;