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
import { IFuelRecord } from "@/interfaces/transport";
import FleetRowActions from "@/components/views/list/shared/fleet-row-actions";
import { DateText, MoneyText } from "@/components/views/list/shared/fleet-badges";

const useFuelColumns = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const columns: ColumnDef<IFuelRecord>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "bus",
      header: ({ column }) => <ColumnHeader column={column} title='fuel_bus' />,
      cell: ({ row }) => (
        <div className='font-medium'>{row.original.bus?.busNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "driver",
      header: ({ column }) => <ColumnHeader column={column} title='fuel_driver' />,
      cell: ({ row }) => (
        <div>{row.original.driver?.fullName || "—"}</div>
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => <ColumnHeader column={column} title='fuel_date' />,
      cell: ({ row }) => <DateText value={row.original.date} />,
    },
    {
      accessorKey: "liters",
      header: ({ column }) => <ColumnHeader column={column} title='fuel_liters' />,
      cell: ({ row }) => (
        <div className='tabular-nums'>
          {row.original.liters !== null && row.original.liters !== undefined
            ? `${row.original.liters} L`
            : "—"}
        </div>
      ),
    },
    {
      accessorKey: "pricePerLiter",
      header: ({ column }) => (
        <ColumnHeader column={column} title='fuel_pricePerLiter' />
      ),
      cell: ({ row }) => <MoneyText value={row.original.pricePerLiter} prefix='$ ' />,
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => (
        <ColumnHeader column={column} title='fuel_totalCost' />
      ),
      cell: ({ row }) => <MoneyText value={row.original.totalCost} prefix='$ ' />,
    },
    {
      accessorKey: "station",
      header: ({ column }) => <ColumnHeader column={column} title='fuel_station' />,
      cell: ({ row }) => (
        <div className='max-w-[200px] truncate text-muted-foreground'>
          {row.original.station || "—"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => {
        const record = row.original;
        return (
          <FleetRowActions
            items={[
              {
                label: t("fuel_form.edit_record"),
                icon: Pencil,
                onClick: () =>
                  dispatch(
                    setFleetFormModal({
                      modalType: "fuel",
                      actionType: "edit",
                      dataId: record._id,
                      data: record as any,
                    })
                  ),
              },
              {
                label: t("fuel_form.delete_record"),
                icon: Trash2,
                destructive: true,
                onClick: () =>
                  dispatch(
                    setFleetFormModal({
                      modalType: "fuel",
                      actionType: "delete",
                      dataId: record._id,
                      data: record as any,
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

export default useFuelColumns;