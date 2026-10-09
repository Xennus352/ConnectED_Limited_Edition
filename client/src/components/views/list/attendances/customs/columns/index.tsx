import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";

import {
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
  RowAnnouncementActions,
} from "@/components/ui/data-table";
import { IAttendance } from "@/interfaces/attendance";

const useColumns = () => {
  const { t } = useTranslation();

  const columns: ColumnDef<IAttendance>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "student",
      header: ({ column }) => <ColumnHeader column={column} title='student' />,
      cell: ({ row }) => (
        <Link
          to={`/list/students/${row.original?.student?._id}`}
          className='hover:underline hover:text-primary'
        >
          {row.original?.student?.fullName}
        </Link>
      ),
    },

    {
      accessorKey: "class",
      header: ({ column }) => <ColumnHeader column={column} title='class' />,
      cell: ({ row }) =>
        row.original?.class ? (
          <Link
            to={`/list/classes/${row.original.class?._id}`}
            className='hover:underline hover:text-primary'
          >
            {row.original?.class?.name} {t("data-table.columns.class")}
          </Link>
        ) : (
          t("data-table.general")
        ),
    },
    {
      accessorKey: "lesson",
      header: ({ column }) => <ColumnHeader column={column} title='lesson' />,
      cell: ({ row }) =>
        row.original?.lesson ? (
          <Link
            to={`/list/lessons/${row.original.lesson?._id}`}
            className='hover:underline hover:text-primary'
          >
            {row.original?.lesson?.name}
          </Link>
        ) : (
          "-"
        ),
    },

    {
      accessorKey: "present",
      header: ({ column }) => <ColumnHeader column={column} title='present' />,
      cell: ({ row }) => {
        const isPresent = row.original?.present;

        return (
          <div className='flex items-center gap-2'>
            {isPresent ? (
              <Check className='text-success w-5 h-5' />
            ) : (
              <X className='text-error w-5 h-5' />
            )}
            <span
              className={isPresent ? "text-success font-medium" : "text-error font-medium"}
            >
              {isPresent ? t('data-table.columns.present') : t('data-table.columns.absent')}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "late",
      header: ({ column }) => <ColumnHeader column={column} title='late' />,
      cell: ({ row }) => {
        const isLate = row.original?.late;
        return (
          <div className='flex items-center gap-2'>
            {isLate ? (
              <span className='text-warning font-medium'>
                <span className='mr-1 inline-flex items-center gap-1'>
                  <span className='inline-block w-2 h-2 rounded-full bg-warning' />
                  {row.original.minutesLate}
                </span>
                {t('data-table.columns.minutes')}
              </span>
            ) : (
              <span className='text-muted-foreground'>—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => <ColumnHeader column={column} title='date' />,
      cell: ({ row }) => {
        const date = new Date(row.original?.date);
        return date ? format(new Date(date), "hh:mm:a, MMMM dd, yyyy") : "-";
      },
    },
    {
      accessorKey: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => <RowAnnouncementActions row={row} />,
    },
  ];

  return {
    columns,
  };
};

export default useColumns;
