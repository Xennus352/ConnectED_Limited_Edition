import { Router } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, notFound } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { isObjectId } from "../../lib/query";
import { mapDoc, stripSecrets } from "../../lib/serialize";
import { buildData, idOf, WriteOptions } from "../../lib/write";
import { crudRouter } from "../shared/crud";

/** Hashes the incoming password and never lets an empty one through. */
const withPassword = async (
  data: Record<string, any>,
  mode: "create" | "update"
) => {
  const plain = typeof data.password === "string" ? data.password.trim() : "";

  delete data.password;

  if (mode === "create" && !plain) {
    throw badRequest("Password is required");
  }

  if (plain) {
    data.password = await hashPassword(plain);
  }

  return data;
};

const userSearchable = ["fullName", "username", "email", "phoneNumber", "address"];
const baseDates = ["birthday"];

/**
 * `subjects` and `assignedClasses` travel as lists of ids (or of populated
 * objects when a form re-submits what it read). MongoDB has no implicit
 * many-to-many, so they are persisted in scalar id lists and expanded back on
 * read — this also keeps them from interfering with `Class.teacher`.
 */
const toIdList = (value: unknown): { raw: unknown[]; ids: string[] } => {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return { raw, ids: raw.map(idOf).filter((id): id is string => Boolean(id)) };
};

const teacherLinks = async (
  data: Record<string, any>,
  mode: "create" | "update"
) => {
  if (data.subjects !== undefined) {
    const { raw, ids } = toIdList(data.subjects);
    if (mode === "create" && raw.length && !ids.length) {
      throw badRequest('"subjects" contains an invalid reference');
    }
    data.subjectIds = ids;
    delete data.subjects;
  }

  if (data.assignedClasses !== undefined) {
    const { raw, ids } = toIdList(data.assignedClasses);
    if (mode === "create" && raw.length && !ids.length) {
      throw badRequest('"assignedClasses" contains an invalid reference');
    }
    data.assignedClassIds = ids;
    delete data.assignedClasses;
  }

  return withPassword(data, mode);
};

const expandTeacherLinks = async (doc: any) => {
  if (!doc) return doc;

  const subjectIds = new Set<string>(doc.subjectIds ?? []);
  const classIds = new Set<string>(doc.assignedClassIds ?? []);
  delete doc.subjectIds;
  delete doc.assignedClassIds;

  const [subjects, classes] = await Promise.all([
    subjectIds.size
      ? prisma.subject.findMany({
          where: { id: { in: [...subjectIds] } },
          select: { id: true, name: true, imgUrl: true, status: true },
        })
      : [],
    classIds.size
      ? prisma.class.findMany({
          where: { id: { in: [...classIds] } },
          select: { id: true, name: true, capacity: true, grade: true },
        })
      : [],
  ]);

  doc.subjects = mapDoc(subjects);
  doc.assignedClasses = mapDoc(classes);

  return doc;
};

// ---------------------------------------------------------------------------
// GET /admins
// ---------------------------------------------------------------------------
export const adminsRouter = crudRouter({
  delegate: "admin",
  searchable: userSearchable,
  statusField: true,
  dateField: "createdAt",
  dates: baseDates,
  relationInputs: {},
  stripSecrets: true,
  beforeWrite: withPassword,
});

// ---------------------------------------------------------------------------
// GET /teachers
// ---------------------------------------------------------------------------
export const teachersRouter = crudRouter({
  delegate: "teacher",
  include: {
    primaryClass: { select: { id: true, name: true, capacity: true } },
    // `assignedClasses` is expanded from `assignedClassIds` in `resolve`.
  },
  searchable: userSearchable,
  statusField: true,
  dateField: "createdAt",
  dates: baseDates,
  // The teachers list filters by subject; subjects live in a scalar id list.
  relationFilters: { subject: { field: "subjectIds", array: true } },
  relationInputs: { primaryClass: "primaryClassId" },
  stripSecrets: true,
  beforeWrite: teacherLinks,
  resolve: expandTeacherLinks,
});

// ---------------------------------------------------------------------------
// GET /students
// ---------------------------------------------------------------------------
export const studentsRouter = crudRouter({
  delegate: "student",
  include: {
    parent: {
      select: {
        id: true,
        fullName: true,
        username: true,
        phoneNumber: true,
        profilePhoto: true,
      },
    },
    class: { select: { id: true, name: true, capacity: true, grade: true } },
  },
  searchable: userSearchable,
  statusField: true,
  dateField: "createdAt",
  dates: baseDates,
  relationFilters: { class: "classId" },
  relationInputs: { class: "classId", parent: "parentId" },
  stripSecrets: true,
  beforeWrite: withPassword,
});

// ---------------------------------------------------------------------------
// GET /parents
// ---------------------------------------------------------------------------
export const parentsRouter = crudRouter({
  delegate: "parent",
  include: {
    children: {
      select: {
        id: true,
        fullName: true,
        username: true,
        profilePhoto: true,
        phoneNumber: true,
        isActive: true,
      },
    },
  },
  searchable: userSearchable,
  statusField: true,
  dateField: "createdAt",
  dates: baseDates,
  relationInputs: {},
  manyRelations: { children: "connect" },
  stripSecrets: true,
  beforeWrite: withPassword,
});


// ---------------------------------------------------------------------------
// GET /drivers
//
// A driver and their bus point at each other on both sides: `Driver.busId`
// (one-to-one, unique) is the authoritative link, while `Bus.driverId` is
// what the fleet map renders. The shared crud router is used for reads, but
// the writes live here so both sides stay in sync and a bus that is already
// assigned errors with a human message before the unique index fires.
// ---------------------------------------------------------------------------
const driverInclude = {
  bus: {
    select: {
      id: true,
      busNumber: true,
      registrationNumber: true,
      name: true,
      capacity: true,
      status: true,
      isActive: true,
      currentLatitude: true,
      currentLongitude: true,
      currentSpeed: true,
      heading: true,
      lastLocationAt: true,
    },
  },
};

const driverWriteOptions: WriteOptions = {
  relations: { bus: "busId" },
  dates: baseDates,
  ignore: ["_id", "id", "createdAt", "updatedAt", "__v"],
};

const presentDriver = (doc: any) => mapDoc(stripSecrets(doc));

/** Keeps `Bus.driverId` aligned with `Driver.busId` after every write. */
const syncBusDriver = async (busId: string, driverId: string | null) => {
  try {
    await prisma.bus.update({ where: { id: busId }, data: { driverId } });
  } catch {
    // The bus may have been deleted underneath us; Driver.busId still wins.
  }
};

/** Rejects a bus that is already assigned to another driver. */
const ensureBusAvailable = async (
  busId: string | null,
  exceptDriverId?: string
) => {
  if (!busId) return;

  const owner = await prisma.driver.findFirst({
    where: {
      busId,
      ...(exceptDriverId ? { id: { not: exceptDriverId } } : {}),
    },
    select: { id: true },
  });

  if (owner) {
    throw badRequest(
      "This bus is already assigned to another driver. Choose another bus first."
    );
  }
};

export const driversRouter = Router();

driversRouter.post(
  "/create",
  asyncHandler(async (req, res) => {
    const data = await withPassword(
      buildData(req.body, driverWriteOptions, "create"),
      "create"
    );
    await ensureBusAvailable(data.busId ?? null);

    const doc = await prisma.driver.create({
      data: data as any,
      include: driverInclude,
    });
    if (data.busId) await syncBusDriver(data.busId, doc.id);

    res.json({ success: true, data: await presentDriver(doc) });
  })
);

driversRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) throw notFound("Resource not found");

    const existing = await prisma.driver.findUnique({
      where: { id },
      include: driverInclude,
    });
    if (!existing) throw notFound("Resource not found");

    const data = await withPassword(
      buildData(req.body, driverWriteOptions, "update"),
      "update"
    );

    if (Object.keys(data).length === 0) {
      res.json({ success: true, data: await presentDriver(existing) });
      return;
    }

    const nextBusId = data.busId ?? null;
    await ensureBusAvailable(nextBusId, id);

    const doc = await prisma.driver.update({
      where: { id },
      data: data as any,
      include: driverInclude,
    });

    // Keep both sides of the link consistent when the vehicle changes.
    if (
      data.busId !== undefined &&
      String(doc.busId ?? "") !== String(existing.busId ?? "")
    ) {
      if (existing.busId && existing.busId !== nextBusId) {
        await syncBusDriver(existing.busId, null);
      }
      if (nextBusId) await syncBusDriver(nextBusId, doc.id);
    }

    res.json({ success: true, data: await presentDriver(doc) });
  })
);

driversRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) throw notFound("Resource not found");

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw notFound("Resource not found");

    if (existing.busId) await syncBusDriver(existing.busId, null);
    const doc = await prisma.driver.delete({ where: { id } });

    res.json({ success: true, data: await presentDriver(doc) });
  })
);

// Reads (list + single) come from the shared crud router.
driversRouter.use(
  crudRouter({
    delegate: "driver",
    include: driverInclude,
    searchable: userSearchable,
    statusField: true,
    dateField: "createdAt",
    dates: baseDates,
    relationInputs: { bus: "busId" },
    stripSecrets: true,
    readOnly: true,
  })
);
