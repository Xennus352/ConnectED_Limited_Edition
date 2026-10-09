import { MaintenanceStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";

/**
 * A maintenance ticket *blocks* its bus from being used by a new trip as long
 * as the ticket is still active (reported / approved / scheduled / in
 * progress) and `blocksOperation` is set. Completion is the explicit
 * "return to service" step and clears the restriction.
 */
const ACTIVE_STATUSES: MaintenanceStatus[] = [
  "REPORTED",
  "APPROVED",
  "SCHEDULED",
  "IN_PROGRESS",
];

export const activeMaintenanceStatuses = ACTIVE_STATUSES;

/** Active blocking tickets for one bus (used to explain *why* it is blocked). */
export const activeMaintenanceForBus = async (busId: string) =>
  prisma.maintenanceRecord.findMany({
    where: {
      busId,
      blocksOperation: true,
      status: { in: activeMaintenanceStatuses },
    },
    orderBy: { date: "desc" },
    take: 5,
  });

/** A bus under blocking maintenance may not start a trip. */
export const hasBlockingMaintenance = async (busId: string): Promise<boolean> => {
  const found = await prisma.maintenanceRecord.findFirst({
    where: {
      busId,
      blocksOperation: true,
      status: { in: activeMaintenanceStatuses },
    },
    select: { id: true },
  });
  return Boolean(found);
};

/** How many active buses are currently restricted by blocking maintenance. */
export const countMaintenanceRestrictedBuses = async (): Promise<number> =>
  prisma.bus.count({
    where: {
      isActive: true,
      maintenanceRecords: {
        some: {
          blocksOperation: true,
          status: { in: activeMaintenanceStatuses },
        },
      },
    },
  });