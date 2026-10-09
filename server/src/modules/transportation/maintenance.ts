import { Router, type RequestHandler } from "express";

import type { AuthUser } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, notFound } from "../../lib/errors";
import { mapDoc } from "../../lib/serialize";
import { emitMaintenanceUpdate } from "../../sockets";
import { crudRouter } from "../shared/crud";

/**
 * Maintenance workflow — server-enforced lifecycle:
 *
 *   REPORTED ─▶ APPROVED ─▶ SCHEDULED ─▶ IN_PROGRESS ─▶ COMPLETED
 *   REPORTED / APPROVED / SCHEDULED ─▶ CANCELLED
 *
 * While a ticket with `blocksOperation` is in one of the active states the
 * bus is excluded from starting new trips (see `availability.ts`). Only the
 * authorized COMPLETE step returns the bus to service.
 */
export const MAINTENANCE_TYPES = [
  "Scheduled service",
  "Inspection",
  "Repair",
  "Tires",
  "Brakes",
  "Engine",
  "Electrical",
  "Other",
] as const;

const MAINTENANCE_TRANSITIONS: Record<string, readonly string[]> = {
  REPORTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const assertTransition = (from: string, to: string): void => {
  const allowed = MAINTENANCE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw badRequest(`Cannot change a maintenance ticket from "${from}" to "${to}"`);
  }
};

const padTicket = (n: number) => String(n).padStart(4, "0");

const floatOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const ACTOR_DELEGATES: Record<string, string> = {
  Admin: "admin",
  Teacher: "teacher",
  Student: "student",
  Parent: "parent",
  Driver: "driver",
};

/** Resolves the human-readable name of the acting user (by auth model). */
const resolveActorName = async (user: AuthUser): Promise<string> => {
  const delegate = ACTOR_DELEGATES[user.model];
  if (!delegate) return "";
  const doc = await (prisma as any)[delegate]?.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });
  return doc?.fullName ?? "";
};

const maintenanceInclude = {
  bus: {
    select: {
      id: true,
      busNumber: true,
      name: true,
      registrationNumber: true,
      status: true,
      isActive: true,
    },
  },
};

const getTicket = async (id: string) => {
  const record = await prisma.maintenanceRecord.findUnique({
    where: { id },
    include: maintenanceInclude,
  });
  if (!record) throw notFound("Maintenance ticket not found");
  return record;
};

/** Shared step between the workflow endpoints. */
const applyTransition = async (
  id: string,
  to: string,
  extra: Record<string, unknown>,
  user: AuthUser
) => {
  const record = await getTicket(id);
  assertTransition(record.status, to);

  const data: Record<string, unknown> = { status: to };
  Object.assign(data, extra);

  // Workflow bodies arrive as JSON (date strings). Prisma DateTime fields
  // need real Date objects — normalize any date-ish field before the update.
  for (const key of [
    "date",
    "plannedDate",
    "scheduledDate",
    "actualStartAt",
    "actualCompletedAt",
    "nextDueAt",
  ]) {
    const value = data[key];
    if (value != null && typeof value === "string" && value !== "") {
      data[key] = new Date(value);
    }
  }

  if (to === "APPROVED") {
    data.reviewedBy = user.id;
    data.reviewedByName = await resolveActorName(user);
  }
  if (to === "COMPLETED") {
    data.actualCompletedAt = new Date();
    data.completedBy = user.id;
    data.completedByName = await resolveActorName(user);
    // Completing a blocking ticket is the "return to service" step.
    data.blocksOperation = false;

    const parts = floatOrNull(data.partsCost);
    const labor = floatOrNull(data.laborCost);
    const other = floatOrNull(data.otherCost);
    if (parts !== null || labor !== null || other !== null) {
      data.totalCost = round2((parts ?? 0) + (labor ?? 0) + (other ?? 0));
    }
  }

  const updated = await prisma.maintenanceRecord.update({
    where: { id },
    data,
    include: maintenanceInclude,
  });
  emitMaintenanceUpdate(updated.busId, updated.id, updated.status);
  return updated;
};

// ---------------------------------------------------------------------------
// Admin CRUD + workflow endpoints
// ---------------------------------------------------------------------------

export const maintenanceRouter: Router = crudRouter({
  delegate: "maintenanceRecord",
  include: maintenanceInclude,
  searchable: ["ticketNumber", "title", "description", "type"],
  relationFilters: { bus: "busId" },
  statusField: true,
  dateField: "date",
  extraFilters: { priority: "priority", severity: "severity", type: "type" },
  dates: [
    "date",
    "plannedDate",
    "scheduledDate",
    "actualStartAt",
    "actualCompletedAt",
    "nextDueAt",
  ],
  relationInputs: { bus: "busId" },
  beforeWrite: async (data, mode, req) => {
    if (mode === "create") {
      if (!MAINTENANCE_TYPES.includes(data.type as any)) {
        throw badRequest(
          `Type must be one of: ${MAINTENANCE_TYPES.join(", ")}`
        );
      }
      if (!data.ticketNumber) {
        const count = await prisma.maintenanceRecord.count();
        data.ticketNumber = `MNT-${padTicket(count + 1)}`;
      }
      data.status = data.status || "REPORTED";
      data.reportedBy = req.user!.id;
      data.reportedByName = await resolveActorName(req.user!);
      data.blocksOperation = data.blocksOperation ?? true;
    } else {
      // Status and identity fields are owned by the workflow endpoints.
      delete data.status;
      delete data.ticketNumber;
      delete data.reportedBy;
      delete data.reportedByName;
    }
    return data;
  },
});

const workflow: Record<string, string> = {
  approve: "APPROVED",
  schedule: "SCHEDULED",
  start: "IN_PROGRESS",
  complete: "COMPLETED",
  cancel: "CANCELLED",
};

for (const [route, to] of Object.entries(workflow)) {
  const handler: RequestHandler = asyncHandler(async (req, res) => {
    const updated = await applyTransition(
      req.params.id,
      to,
      req.body ?? {},
      req.user!
    );
    res.json({
      success: true,
      data: mapDoc(updated),
      message: `${to} — maintenance ticket updated`,
    });
  });
  maintenanceRouter.post(`/:id/${route}`, handler);
}