import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";

import {
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFleetFormModal } from "@/store/slices/fleet-form-modal";
import { IRoute } from "@/interfaces/transport";
import FleetRowActions from "@/components/views/list/shared/fleet-row-actions";
import { StatusBadge } from "@/components/views/list/shared/fleet-badges";

const useRouteColumns = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const columns: ColumnDef<IRoute>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <ColumnHeader column={column} title='routes_name' />
      ),
      cell: ({ row }) => <div className='font-medium'>{row.original.name}</div>,
    },
    {
      accessorKey: "path",
      header: () => <div>{t("data-table.columns.routes_path")}</div>,
      cell: ({ row }) => (
        <div className='text-muted-foreground'>
          {row.original.startLocation || "—"} → {row.original.endLocation || "—"}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "estimatedDuration",
      header: ({ column }) => (
        <ColumnHeader column={column} title='routes_estimatedDuration' />
      ),
      cell: ({ row }) => (
        <div className='tabular-nums'>
          {row.original.estimatedDuration ? `${row.original.estimatedDuration} min` : "—"}
        </div>
      ),
    },
    {
      accessorKey: "stops",
      header: ({ column }) => <ColumnHeader column={column} title='routes_stops' />,
      cell: ({ row }) => (
        <div className='tabular-nums'>{row.original.stops?.length ?? 0}</div>
      ),
    },
    {
      accessorKey: "buses",
      header: ({ column }) => <ColumnHeader column={column} title='routes_buses' />,
      cell: ({ row }) => (
        <div className='tabular-nums'>{row.original.buses?.length ?? 0}</div>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <ColumnHeader column={column} title='routes_isActive' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.isActive} />,
    },
    {
      id: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => {
        const route = row.original;
        return (
          <FleetRowActions
            items={[
              {
                label: t("route_form.edit_route"),
                icon: Pencil,
                onClick: () =>
                  dispatch(
                    setFleetFormModal({
                      modalType: "route",
                      actionType: "edit",
                      dataId: route._id,
                      data: route as any,
                    })
                  ),
              },
              {
                label: t("route_form.delete_route"),
                icon: Trash2,
                destructive: true,
                onClick: () =>
                  dispatch(
                    setFleetFormModal({
                      modalType: "route",
                      actionType: "delete",
                      dataId: route._id,
                      data: route as any,
                    })
                  ),
              },
            ]}
          />
        );
      },
    },
  ];

  return { columns };
};

export default useRouteColumns;