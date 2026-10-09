import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";

import {
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useIncidentsService } from "@/services/transport";
import { IIncident } from "@/interfaces/transport";
import FleetRowActions from "@/components/views/list/shared/fleet-row-actions";
import { StatusBadge, DateText } from "@/components/views/list/shared/fleet-badges";

const useIncidentColumns = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { resolveIncident } = useIncidentsService();

  const columns: ColumnDef<IIncident>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <ColumnHeader column={column} title='incidents_type' />
      ),
      cell: ({ row }) => (
        <div className='font-medium capitalize'>
          {row.original.type.toLowerCase().replace(/_/g, " ")}
        </div>
      ),
    },
    {
      accessorKey: "severity",
      header: ({ column }) => (
        <ColumnHeader column={column} title='incidents_severity' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.severity} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <ColumnHeader column={column} title='incidents_status' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "bus",
      header: ({ column }) => <ColumnHeader column={column} title='incidents_bus' />,
      cell: ({ row }) => (
        <div>{row.original.bus?.busNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "driver",
      header: ({ column }) => (
        <ColumnHeader column={column} title='incidents_driver' />
      ),
      cell: ({ row }) => (
        <div>{row.original.driver?.fullName || "—"}</div>
      ),
    },
    {
      accessorKey: "occurredAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title='incidents_occurredAt' />
      ),
      cell: ({ row }) => <DateText value={row.original.occurredAt} />,
    },
    {
      accessorKey: "resolvedAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title='incidents_resolvedAt' />
      ),
      cell: ({ row }) => <DateText value={row.original.resolvedAt} />,
    },
    {
      id: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => {
        const record = row.original;
        const items = [];

        if (record.status && record.status !== "RESOLVED") {
          items.push({
            label: t("incident_form.resolve"),
            icon: CheckCircle2,
            onClick: () => resolveIncident.mutateAsync(record._id),
          });
        }
        items.push(
          {
            label: t("incident_form.edit_record"),
            icon: Pencil,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "incident",
                  actionType: "edit",
                  dataId: record._id,
                  data: record as any,
                })
              ),
          },
          {
            label: t("incident_form.delete_record"),
            icon: Trash2,
            destructive: true,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "incident",
                  actionType: "delete",
                  dataId: record._id,
                  data: record as any,
                })
              ),
          }
        );

        return <FleetRowActions items={items} />;
      },
    },
  ];

  return { columns };
};

export default useIncidentColumns;