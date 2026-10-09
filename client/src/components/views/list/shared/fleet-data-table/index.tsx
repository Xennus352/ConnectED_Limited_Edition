import { type ReactNode } from "react";

import {
  Pagination,
  TableBody,
  SearchInput,
  TableHeader,
  ViewOptions,
  SelectedRowCount,
} from "@/components/ui/data-table";
import FleetAddBtn from "./fleet-add-btn";
import FleetStatusSelector from "./fleet-status-selector";
import useFleetTableFeatures from "./features";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { FleetModalType } from "@/store/slices/fleet-form-modal";
import { PaginationLoading, TableLoading } from "./loading";

export interface IFleetDataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: { data: TData[]; meta?: any };
  loading?: boolean;
  /** Entity key driving the add button + modal pairing. */
  entity: FleetModalType;
  /** Optional status selector options rendered next to the search box. */
  statusOptions?: { value: string; label: string }[];
  /** Extra filter controls (date ranges, relation selects). */
  filters?: ReactNode;
  /** Show the add record button. Defaults to true. */
  canAdd?: boolean;
}

/**
 * Generic data table for the transport-management screens: search, optional
 * status filters + custom filters, pagination and an add button — all backed
 * by the real list endpoints.
 */
function FleetDataTable<TData>({
  data,
  columns,
  loading = false,
  entity,
  statusOptions,
  filters,
  canAdd = true,
}: IFleetDataTableProps<TData>) {
  const { table, canModify } = useFleetTableFeatures<TData, any>({
    columns,
    data: data?.data || [],
  });

  return (
    <div className='min-w-[1200px]'>
      <div className='flex items-center justify-between py-4'>
        <SearchInput table={table} loading={loading} />
        <div className='flex items-center gap-2 md:gap-3'>
          {statusOptions && statusOptions.length > 0 && (
            <FleetStatusSelector options={statusOptions} />
          )}
          {filters}
          {loading ? (
            <Skeleton className='w-20 h-8' />
          ) : (
            <ViewOptions table={table} />
          )}
          {canModify && canAdd && <FleetAddBtn entity={entity} />}
        </div>
      </div>

      <div className='rounded-md border min-h-[740px]'>
        {loading ? (
          <TableLoading columns={columns.length} />
        ) : (
          <Table>
            <TableHeader table={table} />
            <TableBody table={table} columns={columns} />
          </Table>
        )}
      </div>

      {loading ? (
        <PaginationLoading />
      ) : (
        <div className='flex items-center justify-between'>
          <SelectedRowCount table={table} />
          <Pagination table={table} meta={data?.meta} />
        </div>
      )}
    </div>
  );
}

export default FleetDataTable;