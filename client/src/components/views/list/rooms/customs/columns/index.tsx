import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";

import {
  RowRoomActions,
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { IRoom } from "@/interfaces/room";

export const useColumns = () => {
  const { t } = useTranslation();

  const columns: ColumnDef<IRoom>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title='name' />,
      cell: ({ row }) => (
        <span>
          {row.original.name} {t("room_form.room")}
        </span>
      ),
    },
    {
      accessorKey: "capacity",
      header: ({ column }) => (
        <ColumnHeader column={column} title='capacity' />
      ),
      cell: ({ row }) => (
        <span>
          {row.original?.capacity}{" "}
          {row.original?.capacity > 1
            ? t("app_sidebar.students")
            : t("students_list_profile.student")}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title='createdAt' />
      ),
      cell: ({ row }) => {
        const createdAt = new Date(row.original?.createdAt);
        return format(new Date(createdAt), "MMMM dd, yyyy");
      },
    },
    {
      accessorKey: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => <RowRoomActions row={row} />,
    },
  ];

  return {
    columns,
  };
};

export default useColumns;