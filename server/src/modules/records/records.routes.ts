import { Router } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, forbidden } from "../../lib/errors";
import { isObjectId, toDate } from "../../lib/query";
import { mapDoc } from "../../lib/serialize";
import {
  ADMIN_ROLES,
  STAFF_ROLES,
  assertStaff,
  assertTeacherClass,
  pushScope,
  teacherClassIds,
} from "../../lib/authz";
import { crudRouter } from "../shared/crud";

/**
 * Announcements and events are authored by either an admin or a teacher, which
 * a document database cannot express as a relation. The author is therefore
 * stored as `createdById` + `createdByModel` and resolved here on read.
 */
const withAuthor = async (doc: any) => {
  if (!doc) return doc;

  const model = doc.createdByModel;
  const id = doc.createdById;

  if (!id) {
    doc.createdBy = null;
    delete doc.createdById;
    return doc;
  }

  const delegate: any = model === "teacher" ? prisma.teacher : prisma.admin;

  const author = await delegate.findUnique({
    where: { id },
    select: { id: true, fullName: true, profilePhoto: true, role: true },
  });

  doc.createdBy = author ? mapDoc(author) : null;
  delete doc.createdById;

  return doc;
};

const stampAuthor = (req: any) => (data: Record<string, any>) => {
  if (!data.createdByModel) {
    data.createdByModel = req?.user?.role ?? "admin";
  }
  if (!data.createdById && req?.user?.id) {
    data.createdById = req.user.id;
  }
  return data;
};

/** Teachers write their own records; everyone else may only read theirs. */
const approvedStatuses = ["approved", "finished"];

const parentChildren = async (parentId: string, childId?: string) => {
  if (childId && !isObjectId(childId)) return [];
  return prisma.student.findMany({
    where: { parentId, ...(childId ? { id: childId } : {}) },
    select: { id: true, classId: true },
  });
};

const parentClassIds = async (parentId: string, childId?: string): Promise<string[]> => {
  const children = await parentChildren(parentId, childId);
  return [...new Set(children.map((child) => child.classId).filter((id): id is string => Boolean(id)))];
};

/** Scopes published-record reads by audience (students/parents → approved). */
const broadcastReadScope = async (req: any, where: Record<string, any>) => {
  const role = req.user?.role;
  if (role === "teacher") {
    const scope = await teacherClassIds(req.user.id);
    where.AND = [
      {
        OR: [
          { createdById: req.user.id },
          ...(scope.size ? [{ classId: { in: [...scope] } }] : []),
        ],
      },
    ];
  } else if (role === "student" || role === "parent") {
    where.status = { in: approvedStatuses };
    if (role === "student") {
      const student = await prisma.student.findUnique({ where: { id: req.user.id }, select: { classId: true } });
      pushScope(where, { OR: [{ classId: null }, ...(student?.classId ? [{ classId: student.classId }] : [])] });
    } else {
      const classIds = await parentClassIds(req.user.id, String(req.query?.childId ?? "") || undefined);
      pushScope(where, { OR: [{ classId: null }, { classId: { in: classIds } }] });
    }
  }
};

const broadcastReadOneScope = async (req: any, doc: Record<string, any>) => {
  if (req.user?.role !== "parent" && req.user?.role !== "student") return;
  if (!approvedStatuses.includes(String(doc.status))) {
    throw forbidden("You do not have access to this event");
  }
  if (!doc.classId) return;
  if (req.user?.role === "student") {
    const student = await prisma.student.findUnique({ where: { id: req.user.id }, select: { classId: true } });
    if (student?.classId !== String(doc.classId)) throw forbidden("You do not have access to this event");
    return;
  }
  const classIds = await parentClassIds(req.user.id);
  if (!classIds.includes(String(doc.classId))) {
    throw forbidden("You do not have access to this event");
  }
};

/**
 * Announcements/events ownership + approval guard. Teachers and drivers may
 * manage only records they authored, and can never flip a record to
 * `approved`/`rejected` — that authority stays with admins, preserving the
 * existing workflow.
 */
const broadcastWriteScope = async (
  req: any,
  mode: "create" | "update" | "delete",
  target: Record<string, any>,
  payload?: Record<string, any>
) => {
  const role = req.user?.role;
  if (role !== "teacher" && role !== "driver") return;

  if (mode === "delete") {
    if (target.createdById !== req.user.id || target.createdByModel !== "teacher") {
      throw forbidden("You can only delete records you wrote");
    }
    return;
  }

  if (mode === "create") {
    // The author identity always comes from the session, never the body.
    target.createdById = req.user.id;
    target.createdByModel = "teacher";
    if (target.classId) await assertTeacherClass(req, target.classId);
    if (payload?.status && ["approved", "rejected"].includes(payload.status)) {
      payload.status = "pending";
    }
    return;
  }

  // update
  if (target.createdById !== req.user.id || target.createdByModel !== "teacher") {
    throw forbidden("You can only edit records you wrote");
  }
  const nextClass = payload?.classId ?? target.classId ?? null;
  if (nextClass) await assertTeacherClass(req, nextClass);
  if (payload?.status && ["approved", "rejected"].includes(payload.status)) {
    payload.status = "pending";
  }
};

const broadcastAuthz = {
  writeRoles: STAFF_ROLES,
  readScope: broadcastReadScope,
  readOneScope: broadcastReadOneScope,
  writeScope: broadcastWriteScope,
};

// ---------------------------------------------------------------------------
// GET /results
// ---------------------------------------------------------------------------
const resultReadOneScope = async (req: any, doc: Record<string, any>) => {
  const role = req.user?.role;
  if (role === "teacher") {
    const scope = await teacherClassIds(req.user.id);
    if (doc.classId && !scope.has(String(doc.classId))) {
      throw forbidden("You do not have access to this result");
    }
  } else if (role === "student") {
    if (String(doc.studentId ?? "") !== String(req.user.id)) {
      throw forbidden("You can only view your own results");
    }
  } else if (role === "parent") {
    const root = await prisma.student.findUnique({
      where: { id: doc.studentId },
      select: { parentId: true },
    });
    if (!root || root.parentId !== req.user.id) {
      throw forbidden("You can only view your children's results");
    }
  }
};

export const resultsRouter = crudRouter({
  delegate: "result",
  include: {
    student: {
      select: { id: true, fullName: true, profilePhoto: true, username: true },
    },
    exam: { select: { id: true, name: true } },
    assignment: { select: { id: true, name: true } },
    class: { select: { id: true, name: true } },
  },
  searchable: ["description"],
  dateField: "createdAt",
  relationFilters: { class: "classId", student: "studentId" },
  relationInputs: {
    student: "studentId",
    exam: "examId",
    assignment: "assignmentId",
    class: "classId",
  },
  dates: [],
  postWhere: (where, query) => {
    const type = query.type;
    if (type === "exam") where.examId = { not: null };
    if (type === "assignment") where.assignmentId = { not: null };
  },
  authz: {
    // Results stay read-only for teachers: only admins enter marks.
    writeRoles: ADMIN_ROLES,
    readScope: async (req, where) => {
      const role = req.user?.role;
      const uid = req.user?.id;
      if (!uid) return;
      if (role === "teacher") {
        const scope = await teacherClassIds(uid);
        pushScope(where, { classId: { in: [...scope] } });
      } else if (role === "student") {
        pushScope(where, { studentId: uid });
      } else if (role === "parent") {
        const children = await parentChildren(uid, String(req.query?.childId ?? "") || undefined);
        pushScope(where, { studentId: { in: children.map((c) => c.id) } });
      }
    },
    readOneScope: resultReadOneScope,
  },
});

// ---------------------------------------------------------------------------
// GET /attendances
// ---------------------------------------------------------------------------

/** Inserts or updates one attendance row for (student, class, date, lesson). */
const upsertAttendance = async ({
  studentId,
  classId,
  lessonId,
  date,
  present,
  late,
  minutesLate,
}: {
  studentId: string;
  classId: string;
  lessonId?: string | null;
  date: Date;
  present: boolean;
  late: boolean;
  minutesLate: number;
}) => {
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );

  const existing = await prisma.attendance.findFirst({
    where: {
      studentId,
      classId,
      ...(lessonId ? { lessonId } : {}),
      date: dayStart,
    },
    select: { id: true },
  });

  const data = {
    studentId,
    classId,
    ...(lessonId ? { lessonId } : {}),
    date: dayStart,
    present,
    late,
    minutesLate,
  };

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.attendance.create({ data });
};

export const attendancesRouter = crudRouter({
  delegate: "attendance",
  include: {
    student: {
      select: { id: true, fullName: true, profilePhoto: true, username: true },
    },
    lesson: { select: { id: true, name: true, day: true } },
    class: { select: { id: true, name: true } },
  },
  dateField: "date",
  relationFilters: {
    class: "classId",
    lesson: "lessonId",
    student: "studentId",
  },
  relationInputs: {
    student: "studentId",
    lesson: "lessonId",
    class: "classId",
  },
  dates: ["date"],
  orderBy: { date: "desc" },
  authz: {
    writeRoles: STAFF_ROLES,
    readScope: async (req, where) => {
      if (req.user?.role === "teacher") {
        const scope = await teacherClassIds(req.user.id);
        pushScope(where, { classId: { in: [...scope] } });
      } else if (req.user?.role === "parent") {
        const children = await parentChildren(req.user.id, String(req.query?.childId ?? "") || undefined);
        pushScope(where, { studentId: { in: children.map((child) => child.id) } });
      } else if (req.user?.role === "student") {
        pushScope(where, { studentId: req.user.id });
      }
    },
    writeScope: async (req, mode, target) => {
      if (req.user?.role !== "teacher") return;
      await assertTeacherClass(req, target.classId);
    },
    readOneScope: async (req, doc) => {
      if (req.user?.role === "teacher") {
        const scope = await teacherClassIds(req.user.id);
        if (doc.classId && !scope.has(String(doc.classId))) {
          throw forbidden("You do not have access to this attendance record");
        }
      } else if (req.user?.role === "parent") {
        const child = doc.studentId ? await prisma.student.findFirst({ where: { id: String(doc.studentId), parentId: req.user.id }, select: { id: true } }) : null;
        if (!child) throw forbidden("You can only view your children's attendance");
      } else if (req.user?.role === "student" && String(doc.studentId ?? "") !== String(req.user.id)) {
        throw forbidden("You can only view your own attendance");
      }
    },
  },
  extraRoutes: (router) => {
    // POST /attendances/create is overridden with an upsert so a duplicate
    // save for the same (student, class, date, lesson) updates instead of
    // creating a second record.
    router.post(
      "/create",
      asyncHandler(async (req, res) => {
        assertStaff(req);
        const { studentId, classId, lessonId, date } = req.body ?? {};

        if (!isObjectId(studentId) || !isObjectId(classId)) {
          throw badRequest("A valid student and class are required");
        }
        const day = toDate(date);
        if (!day) throw badRequest("A valid date is required");

        if (req.user?.role === "teacher") {
          await assertTeacherClass(req, classId);
        }

        const doc = await upsertAttendance({
          studentId,
          classId,
          lessonId: lessonId || null,
          date: day,
          present: req.body?.present !== false,
          late: Boolean(req.body?.late),
          minutesLate: Math.max(0, Number(req.body?.minutesLate ?? 0)),
        });

        res.json({ success: true, data: mapDoc(doc) });
      })
    );

    // POST /attendances/bulk  { classId, date, lessonId?, entries: [...] }
    // Applies a whole roster in one call. Each row is upserted; rows whose
    // student does not belong to the class are reported and skipped.
    router.post(
      "/bulk",
      asyncHandler(async (req, res) => {
        assertStaff(req);
        const { classId, date, lessonId, entries } = req.body ?? {};

        if (!isObjectId(classId)) {
          throw badRequest("A valid classId is required");
        }
        if (req.user?.role === "teacher") {
          await assertTeacherClass(req, classId);
        }
        const day = toDate(date);
        if (!day) throw badRequest("A valid date is required");
        if (!Array.isArray(entries) || entries.length === 0) {
          throw badRequest("entries must be a non-empty array");
        }
        if (entries.length > 500) {
          throw badRequest("Too many entries in one request");
        }

        const inClass = await prisma.student.findMany({
          where: { classId, id: { in: entries.map((e) => e?.studentId).filter(isObjectId) } },
          select: { id: true },
        });
        const inClassIds = new Set(inClass.map((s) => s.id));

        const applied: string[] = [];
        const skipped: string[] = [];

        for (const entry of entries) {
          if (!isObjectId(entry?.studentId)) {
            skipped.push(String(entry?.studentId ?? "unknown"));
            continue;
          }
          if (!inClassIds.has(entry.studentId)) {
            skipped.push(entry.studentId);
            continue;
          }
          await upsertAttendance({
            studentId: entry.studentId,
            classId,
            lessonId: lessonId || null,
            date: day,
            present: entry.present !== false,
            late: Boolean(entry.late),
            minutesLate: Math.max(0, Number(entry.minutesLate ?? 0)),
          });
          applied.push(entry.studentId);
        }

        res.json({
          success: true,
          data: { applied, skipped },
          meta: { total: applied.length, skipped: skipped.length },
        });
      })
    );
  },
});

// ---------------------------------------------------------------------------
// GET /announcements
// ---------------------------------------------------------------------------
export const announcementsRouter = crudRouter({
  delegate: "announcement",
  include: { class: { select: { id: true, name: true, capacity: true } } },
  searchable: ["name", "description"],
  statusField: true,
  dateField: "date",
  relationFilters: { class: "classId" },
  relationInputs: { class: "classId", createdBy: "createdById" },
  dates: ["date"],
  orderBy: { date: "desc" },
  resolve: withAuthor,
  beforeWrite: (data, mode, req) => {
    if (mode === "create") return stampAuthor(req)(data);
    // The author of a record never changes when somebody edits it.
    delete data.createdById;
    delete data.createdByModel;
    return data;
  },
  authz: broadcastAuthz,
});

// ---------------------------------------------------------------------------
// GET /events
// ---------------------------------------------------------------------------
export const eventsRouter = crudRouter({
  delegate: "event",
  include: { class: { select: { id: true, name: true, capacity: true } } },
  searchable: ["name", "description"],
  statusField: true,
  dateField: "startDate",
  relationFilters: { class: "classId" },
  relationInputs: { class: "classId", createdBy: "createdById" },
  dates: ["startDate", "endDate"],
  orderBy: { startDate: "desc" },
  resolve: withAuthor,
  beforeWrite: (data, mode, req) => {
    if (mode === "create") return stampAuthor(req)(data);
    delete data.createdById;
    delete data.createdByModel;
    return data;
  },
  authz: broadcastAuthz,
});
