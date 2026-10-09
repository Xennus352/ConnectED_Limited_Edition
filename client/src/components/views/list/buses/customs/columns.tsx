import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Copy, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";

import {
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useBusesService } from "@/services/transport";
import { IBusFull } from "@/interfaces/transport";
import FleetRowActions, {
  IFleetRowActionItem,
} from "@/components/views/list/shared/fleet-row-actions";
import { StatusBadge } from "@/components/views/list/shared/fleet-badges";

const useBusColumns = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { restoreBus } = useBusesService();

  const handleRestore = (busId: string) => {
    restoreBus.mutateAsync(busId);
  };

  const columns: ColumnDef<IBusFull>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "busNumber",
      header: ({ column }) => (
        <ColumnHeader column={column} title='buses_busNumber' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.original.busNumber}</div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title='buses_name' />,
      cell: ({ row }) => <div>{row.original.name || "—"}</div>,
    },
    {
      accessorKey: "registrationNumber",
      header: ({ column }) => (
        <ColumnHeader column={column} title='buses_registrationNumber' />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-1 text-muted-foreground'>
          {row.original.registrationNumber}
          <Copy className='h-3 w-3 opacity-60' />
        </div>
      ),
    },
    {
      accessorKey: "driver",
      header: ({ column }) => <ColumnHeader column={column} title='buses_driver' />,
      cell: ({ row }) => (
        <div>{row.original.driver?.fullName || "—"}</div>
      ),
    },
    {
      accessorKey: "route",
      header: ({ column }) => <ColumnHeader column={column} title='buses_route' />,
      cell: ({ row }) => (
        <div>{row.original.route?.name || "—"}</div>
      ),
    },
    {
      accessorKey: "capacity",
      header: ({ column }) => (
        <ColumnHeader column={column} title='buses_capacity' />
      ),
      cell: ({ row }) => <div className='tabular-nums'>{row.original.capacity}</div>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <ColumnHeader column={column} title='buses_status' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => {
        const bus = row.original;
        const items: IFleetRowActionItem[] = [
          {
            label: t("bus_form.view_profile"),
            icon: Eye,
            onClick: () => navigate(`/list/buses/${bus._id}`),
          },
          {
            label: t("bus_form.edit_bus"),
            icon: Pencil,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "bus",
                  actionType: "edit",
                  dataId: bus._id,
                  data: bus as any,
                })
              ),
          },
        ];

        if (!bus.isActive) {
          items.push({
            label: t("bus_form.restore"),
            icon: RotateCcw,
            onClick: () => handleRestore(bus._id),
          });
        } else {
          items.push({
            label: t("bus_form.archive"),
            icon: Trash2,
            destructive: true,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "bus",
                  actionType: "delete",
                  dataId: bus._id,
                  data: bus as any,
                })
              ),
          });
        }

        return <FleetRowActions items={items} />;
      },
    },
  ];

  return { columns };
};

export default useBusColumns;