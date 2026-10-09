import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";

import {
  UserInfo,
  IsActive,
  ColumnHeader,
  RowSelection,
  CopyableText,
  RowUserActions,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { IDriver } from "@/interfaces/user";
import BusInfo from "../bus-info";

export const useColumns = () => {
  const { t } = useTranslation();

  const columns: ColumnDef<IDriver>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "fullName",
      header: ({ column }) => (
        <ColumnHeader column={column} title='fullName' />
      ),
      cell: ({ row }) => <UserInfo row={row} accessorKey='fullName' />,
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <ColumnHeader column={column} title='isActive' />
      ),
      cell: ({ row }) => <IsActive row={row} />,
    },
    {
      id: "bus",
      header: ({ column }) => (
        <ColumnHeader column={column} title='bus' />
      ),
      cell: ({ row }) => <BusInfo row={row} />,
    },
    {
      accessorKey: "phoneNumber",
      header: ({ column }) => (
        <ColumnHeader column={column} title='phoneNumber' />
      ),
      cell: ({ row }) => (
        <CopyableText row={row} accessorKey='phoneNumber' />
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <ColumnHeader column={column} title='email' />
      ),
      cell: ({ row }) => {
        const email = row.original.email;

        return email ? <CopyableText row={row} accessorKey='email' /> : '-';
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <ColumnHeader column={column} title='status' />
      ),
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize w-fit'>
            {t(`data-table.status_options.${status}`) || status}
          </span>
        );
      },
    },
    {
      accessorKey: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => <RowUserActions row={row} />,
    },
  ];

  return {
    columns,
  };
};

export default useColumns;