import { useTranslation } from "react-i18next";
import {
  CalendarPlus,
  CheckCircle2,
  CircleSlash2,
  Pencil,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";

import {
  ColumnHeader,
  RowSelection,
  RowSelectionHeader,
} from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFleetFormModal } from "@/store/slices/fleet-form-modal";
import { useMaintenanceService } from "@/services/transport";
import { IMaintenanceRecord } from "@/interfaces/transport";
import FleetRowActions, {
  IFleetRowActionItem,
} from "@/components/views/list/shared/fleet-row-actions";
import {
  StatusBadge,
  BlockingBadge,
  DateText,
  MoneyText,
} from "@/components/views/list/shared/fleet-badges";

const useMaintenanceColumns = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { runWorkflow } = useMaintenanceService();

  const workflowItem = (
    status: string,
    record: IMaintenanceRecord,
    action: "approve" | "schedule" | "start" | "cancel",
    labelKey: string,
    icon: any,
    destructive = false
  ): IFleetRowActionItem[] => {
    const transitions: Record<string, string[]> = {
      REPORTED: ["approve", "cancel"],
      APPROVED: ["schedule", "cancel"],
      SCHEDULED: ["start", "cancel"],
      IN_PROGRESS: ["cancel"],
    };
    if (!(transitions[status] ?? []).includes(action)) return [];
    return [
      {
        label: t(labelKey),
        icon,
        destructive,
        onClick: () => runWorkflow.mutateAsync({ recordId: record._id, action }),
      },
    ];
  };

  const columns: ColumnDef<IMaintenanceRecord>[] = [
    {
      id: "select",
      header: ({ table }) => <RowSelectionHeader table={table} />,
      cell: ({ row }) => <RowSelection row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "ticketNumber",
      header: ({ column }) => (
        <ColumnHeader column={column} title='maintenance_ticketNumber' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.original.ticketNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <ColumnHeader column={column} title='maintenance_title' />
      ),
      cell: ({ row }) => (
        <div className='max-w-[240px] truncate'>
          {row.original.title || row.original.type}
        </div>
      ),
    },
    {
      accessorKey: "bus",
      header: ({ column }) => <ColumnHeader column={column} title='maintenance_bus' />,
      cell: ({ row }) => (
        <div>{row.original.bus?.busNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <ColumnHeader column={column} title='maintenance_status' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <ColumnHeader column={column} title='maintenance_priority' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    {
      accessorKey: "severity",
      header: ({ column }) => (
        <ColumnHeader column={column} title='maintenance_severity' />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.severity} />,
    },
    {
      accessorKey: "blocksOperation",
      header: () => <div>{t("data-table.columns.maintenance_blocksOperation")}</div>,
      cell: ({ row }) => <BlockingBadge blocking={row.original.blocksOperation} />,
      enableSorting: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => <ColumnHeader column={column} title='maintenance_date' />,
      cell: ({ row }) => <DateText value={row.original.date} />,
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => (
        <ColumnHeader column={column} title='maintenance_totalCost' />
      ),
      cell: ({ row }) => <MoneyText value={row.original.totalCost} prefix='$ ' />,
    },
    {
      id: "actions",
      header: () => (
        <div className='text-right'>{t("data-table.columns.actions")}</div>
      ),
      cell: ({ row }) => {
        const record = row.original;
        const status = record.status;

        const items: IFleetRowActionItem[] = [
          ...workflowItem(status, record, "approve", "maintenance_form.approve_ticket", ShieldCheck),
          ...workflowItem(status, record, "schedule", "maintenance_form.schedule_ticket", CalendarPlus),
          ...workflowItem(status, record, "start", "maintenance_form.start_work", Wrench),
          ...workflowItem(status, record, "cancel", "maintenance_form.cancel_ticket", CircleSlash2, true),
        ];

        if (status === "IN_PROGRESS") {
          items.push({
            label: t("maintenance_form.complete_ticket"),
            icon: CheckCircle2,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "maintenance",
                  actionType: "complete",
                  dataId: record._id,
                  data: record as any,
                })
              ),
          });
        }

        if (["REPORTED", "APPROVED", "SCHEDULED", "IN_PROGRESS"].includes(status)) {
          items.push({
            label: t("maintenance_form.edit_record"),
            icon: Pencil,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "maintenance",
                  actionType: "edit",
                  dataId: record._id,
                  data: record as any,
                })
              ),
          });
          items.push({
            label: t("maintenance_form.delete_record"),
            icon: Trash2,
            destructive: true,
            onClick: () =>
              dispatch(
                setFleetFormModal({
                  modalType: "maintenance",
                  actionType: "delete",
                  dataId: record._id,
                  data: record as any,
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

export default useMaintenanceColumns;