import { useMemo, useState } from "react";
import {
  SortingState,
  useReactTable,
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
} from "@tanstack/react-table";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { TUser } from "@/interfaces/user";

interface IFleetTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

/**
 * TanStack setup for the transport-management tables. Every transport
 * surface is an admin/super-admin screen, so `canModify` follows the role
 * rather than the pathname.
 */
const useFleetTableFeatures = <TData, TValue>({
  data,
  columns,
}: IFleetTableProps<TData, TValue>) => {
  const user = useAuthUser() as TUser;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const canModify = useMemo(
    () => ["super-admin", "admin"].includes(user?.role ?? ""),
    [user]
  );

  return { table, canModify };
};

export default useFleetTableFeatures;