import { Request, Router } from "express";

import { prisma } from "../../config/prisma";
import { badRequest, forbidden } from "../../lib/errors";
import { isObjectId, toDate } from "../../lib/query";
import { mapDoc } from "../../lib/serialize";
import { asyncHandler } from "../../lib/async-handler";
import {
  ADMIN_ROLES,
  STAFF_ROLES,
  assertTeacherClass,
  pushScope,
  teacherClassIds,
} from "../../lib/authz";
import { crudRouter } from "../shared/crud";

const yangonDayStart = (now = new Date()): Date => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Yangon", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")) - 6.5 * 60 * 60 * 1000);
};

const applyAfterDateFilter = (where: Record<string, any>, query: Record<string, any>, key: string, field: string) => {
  const raw = query[key];
  if (raw === undefined) return;
  const parsed = toDate(raw);
  if (!parsed) throw badRequest(`A valid ${key} date is required`);
  where[field] = { ...(where[field] ?? {}), gte: yangonDayStart(parsed) };
};

export const studentDashboardRouter = Router();
studentDashboardRouter.get("/dashboard-summary", asyncHandler(async (req, res) => {
  if (req.user?.role?.toLowerCase?.() !== "student") throw forbidden("Student access required");
  const student = await prisma.student.findUnique({ where: { id: req.user.id }, select: { classId: true } });
  if (!student) throw forbidden("Student record not found");

  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Yangon" }).format(now).toUpperCase();
  const dayStart = yangonDayStart(now);
  const [todayLessons, attendanceTotal, presentTotal, lessonRows] = await Promise.all([
    student.classId ? prisma.lesson.count({ where: { classId: student.classId, day: weekday, status: { notIn: ["cancelled", "CANCELLED"] } } }) : Promise.resolve(0),
    prisma.attendance.count({ where: { studentId: req.user.id } }),
    prisma.attendance.count({ where: { studentId: req.user.id, present: true } }),
    student.classId ? prisma.lesson.findMany({ where: { classId: student.classId }, select: { id: true } }) : Promise.resolve([]),
  ]);
  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const [upcomingExams, upcomingAssignments] = lessonIds.length ? await Promise.all([
    prisma.exam.count({ where: { lessonId: { in: lessonIds }, startTime: { gte: dayStart } } }),
    prisma.assignment.count({ where: { lessonId: { in: lessonIds }, dueDate: { gte: dayStart } } }),
  ]) : [0, 0];

  res.json({ success: true, data: {
    todayLessons,
    upcomingExams,
    upcomingAssignments,
    attendanceRate: attendanceTotal ? Math.round((presentTotal / attendanceTotal) * 100) : null,
    attendanceRecords: attendanceTotal,
    timezone: "Asia/Yangon",
  } });
}));

const classSummary = { select: { id: true, name: true, capacity: true } };
const personSummary = {
  select: {
    id: true,
    fullName: true,
    profilePhoto: true,
    phoneNumber: true,
    role: true,
  },
};

/** Instance of the same day (day of week) with a new time-of-day. */
const timeOnDay = (day: Date, h: number, m: number): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);

const timeMinutes = (value: Date | string | undefined): number | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

/**
 * Server-side timetable validation: start < end, no duplicate entries on the
 * same day, and no overlap for the teacher, class or room. Runs for every
 * create/update so a crafted API request cannot bypass the checks the form
 * performs.
 */
const assertLessonSchedule = async (
  data: Record<string, any>,
  mode: "create" | "update",
  req: Request
) => {
  const existing =
    mode === "update" && req.params.id
      ? await prisma.lesson.findUnique({ where: { id: req.params.id } })
      : null;

  const start: Date | null = data.startTime ?? existing?.startTime ?? null;
  const end: Date | null = data.endTime ?? existing?.endTime ?? null;
  if (!start || !end) {
    throw badRequest("A start and end time are required");
  }

  const startMin = timeMinutes(start);
  const endMin = timeMinutes(end);
  if (startMin === null || endMin === null || startMin >= endMin) {
    throw badRequest("A lesson must start before it ends");
  }

  const day = data.day ?? existing?.day ?? "MONDAY";
  const teacherId = data.teacherId ?? existing?.teacherId ?? null;
  const classId = data.classId ?? existing?.classId ?? null;
  const roomId = data.roomId ?? existing?.roomId ?? null;

  const actors: Array<{ label: string; where: Record<string, any> }> = [];
  if (teacherId) actors.push({ label: "teacher", where: { teacherId } });
  if (classId) actors.push({ label: "class", where: { classId } });
  if (roomId) actors.push({ label: "room", where: { roomId } });

  // A lesson with no teacher/class/room cannot conflict with anything.
  if (!actors.length) return data;

  // "08:00"-style inputs parse onto *today's* date, so compare time-of-day
  // across the same weekday rather than absolute instants.
  const aStart = timeOnDay(start, Math.floor(startMin / 60), startMin % 60);
  const aEnd = timeOnDay(end, Math.floor(endMin / 60), endMin % 60);

  const overlaps =
    (lesson: { startTime: Date; endTime: Date }) => {
      const bStartT = timeMinutes(lesson.startTime);
      const bEndT = timeMinutes(lesson.endTime);
      if (bStartT === null || bEndT === null) return false;
      const bStart = timeOnDay(lesson.startTime, Math.floor(bStartT / 60), bStartT % 60);
      const bEnd = timeOnDay(lesson.startTime, Math.floor(bEndT / 60), bEndT % 60);
      return aStart < bEnd && bStart < aEnd;
    };

  // Each actor group is checked on its own: a teacher being double-booked, a
  // class getting two lessons at once, or a room collision are three separate
  // conflicts, and any one of them must reject the request.
  for (const actor of actors) {
    const candidates = await prisma.lesson.findMany({
      where: {
        day,
        AND: [actor.where],
        ...(mode === "update" && existing ? { NOT: { id: existing.id } } : {}),
      },
      select: { id: true, startTime: true, endTime: true, name: true },
    });

    const hit = candidates.find(overlaps);
    if (hit) {
      throw badRequest(
        `This lesson overlaps with "${hit.name}" for the same ${actor.label} — pick a different time`
      );
    }
  }

  return data;
};

/** Scope a teacher's list reads to lessons of their classes or their own. */
const scopeLessonsForTeacher = async (
  req: any,
  where: Record<string, any>
): Promise<void> => {
  if (req.user?.role !== "teacher") return;
  const scope = await teacherClassIds(req.user.id);
  const guard: Record<string, any>[] = [{ teacherId: req.user.id }];
  if (scope.size) guard.push({ classId: { in: [...scope] } });
  where.AND = [...(where.AND ?? []), { OR: guard }];
};

const scopeLessonsForParent = async (req: any, where: Record<string, any>) => {
  if (req.user?.role !== "parent") return;
  const classIds = await parentClassIds(req.user.id);
  pushScope(where, { classId: { in: classIds } });
};

/** Student identity is the authenticated Student record id. Never accept a class id from the client. */
const studentClassIds = async (studentId: string): Promise<string[]> => {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
  return student?.classId ? [student.classId] : [];
};

const scopeLessonsForStudent = async (req: any, where: Record<string, any>) => {
  if (req.user?.role !== "student") return;
  const classIds = await studentClassIds(req.user.id);
  pushScope(where, { classId: { in: classIds } });
};

const assertLessonReadAccess = async (req: any, doc: Record<string, any>) => {
  const role = req.user?.role;
  if (role === "student") {
    const classIds = await studentClassIds(req.user.id);
    if (!doc.classId || !classIds.includes(String(doc.classId))) throw forbidden("You do not have access to this lesson");
  } else if (role === "parent") {
    const classIds = await parentClassIds(req.user.id);
    if (!doc.classId || !classIds.includes(String(doc.classId))) throw forbidden("You do not have access to this lesson");
  } else if (role === "teacher") {
    if (doc.teacherId === req.user.id) return;
    const classIds = await teacherClassIds(req.user.id);
    if (!doc.classId || !classIds.has(String(doc.classId))) throw forbidden("You do not have access to this lesson");
  }
};

/** A lesson id must belong to the teacher's authorized set. */
const assertTeacherLesson = async (
  req: any,
  lessonId: string | null | undefined
): Promise<void> => {
  if (req.user?.role !== "teacher") return;
  if (!isObjectId(lessonId)) {
    throw badRequest("A valid lesson is required for this operation");
  }
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, teacherId: true, classId: true },
  });
  if (!lesson) throw badRequest("The referenced lesson does not exist");

  if (lesson.teacherId === req.user.id) return;
  const scope = await teacherClassIds(req.user.id);
  if (lesson.classId && scope.has(String(lesson.classId))) return;

  throw forbidden("You do not have access to this lesson");
};

/** E.g. GET /exams?class=… leaks other classes; scope reads for teachers. */
const scopeByLessonForTeacher = async (
  req: any,
  where: Record<string, any>
): Promise<void> => {
  if (req.user?.role !== "teacher") return;
  const scope = await teacherClassIds(req.user.id);
  const guard: Record<string, any>[] = [{ teacherId: req.user.id }];
  if (scope.size) guard.push({ classId: { in: [...scope] } });

  const lessons = await prisma.lesson.findMany({
    where: { OR: guard },
    select: { id: true },
  });
  pushScope(where, { lessonId: { in: lessons.map((l) => l.id) } });
};

const parentClassIds = async (parentId: string, childId?: string): Promise<string[]> => {
  if (childId && !isObjectId(childId)) return [];
  const children = await prisma.student.findMany({
    where: { parentId, ...(childId ? { id: childId } : {}) },
    select: { classId: true },
  });
  return [...new Set(children.map((child) => child.classId).filter((id): id is string => Boolean(id)))];
};

/** Parent academic feeds are limited to lessons in their children's classes. */
const scopeAcademicForParent = async (req: any, where: Record<string, any>) => {
  if (req.user?.role !== "parent") return;
  const classIds = await parentClassIds(req.user.id, String(req.query?.childId ?? "") || undefined);
  const lessons = classIds.length
    ? await prisma.lesson.findMany({ where: { classId: { in: classIds } }, select: { id: true } })
    : [];
  pushScope(where, { lessonId: { in: lessons.map((lesson) => lesson.id) } });
};

const scopeAcademicForStudent = async (req: any, where: Record<string, any>) => {
  if (req.user?.role !== "student") return;
  const classIds = await studentClassIds(req.user.id);
  const lessons = classIds.length
    ? await prisma.lesson.findMany({ where: { classId: { in: classIds } }, select: { id: true } })
    : [];
  pushScope(where, { lessonId: { in: lessons.map((lesson) => lesson.id) } });
};

const assertParentAcademicItem = async (req: any, doc: Record<string, any>) => {
  if (req.user?.role === "student") {
    if (!doc.lessonId) throw forbidden("You do not have access to this item");
    const lesson = await prisma.lesson.findUnique({ where: { id: String(doc.lessonId) }, select: { classId: true } });
    const classIds = await studentClassIds(req.user.id);
    if (!lesson?.classId || !classIds.includes(lesson.classId)) throw forbidden("You do not have access to this item");
    return;
  }
  if (req.user?.role !== "parent") return;
  if (!doc.lessonId) throw forbidden("You do not have access to this item");
  const lesson = await prisma.lesson.findUnique({ where: { id: String(doc.lessonId) }, select: { classId: true } });
  const classIds = await parentClassIds(req.user.id);
  if (!lesson?.classId || !classIds.includes(lesson.classId)) {
    throw forbidden("You do not have access to this item");
  }
};

// ---------------------------------------------------------------------------
// GET /classes
// ---------------------------------------------------------------------------
export const classesRouter = crudRouter({
  delegate: "class",
  include: { teacher: personSummary, room: { select: { id: true, name: true, capacity: true } } },
  searchable: ["name", "grade"],
  statusField: true,
  relationInputs: { teacher: "teacherId", room: "roomId" },
  dates: [],
  authz: {
    readRoles: STAFF_ROLES,
    writeRoles: ADMIN_ROLES,
    readScope: async (req, where) => {
      if (req.user?.role !== "teacher") return;
      const scope = await teacherClassIds(req.user.id);
      pushScope(where, { id: { in: [...scope] } });
    },
  },
});

// ---------------------------------------------------------------------------
// GET /rooms
// ---------------------------------------------------------------------------
export const roomsRouter = crudRouter({
  delegate: "room",
  searchable: ["name"],
  dates: [],
  authz: { readRoles: STAFF_ROLES, writeRoles: ADMIN_ROLES },
});

// ---------------------------------------------------------------------------
// GET /subjects
// ---------------------------------------------------------------------------
const expandSubjectTeachers = async (doc: any) => {
  if (!doc) return doc;

  const teachers = await prisma.teacher.findMany({
    where: { subjectIds: { has: doc._id } },
    select: {
      id: true,
      fullName: true,
      profilePhoto: true,
      phoneNumber: true,
      role: true,
    },
  });

  doc.teachers = mapDoc(teachers);
  return doc;
};

export const subjectsRouter = crudRouter({
  delegate: "subject",
  searchable: ["name", "description"],
  statusField: true,
  dates: [],
  resolve: expandSubjectTeachers,
  authz: { readRoles: STAFF_ROLES, writeRoles: ADMIN_ROLES },
});

// ---------------------------------------------------------------------------
// GET /lessons  (+ /lessons/class/:classId, /lessons/teacher/:teacherId)
// ---------------------------------------------------------------------------
export const lessonsRouter = crudRouter({
  delegate: "lesson",
  include: {
    subject: { select: { id: true, name: true } },
    class: classSummary,
    room: { select: { id: true, name: true } },
    teacher: { select: { id: true, fullName: true, profilePhoto: true } },
  },
  searchable: ["name", "day"],
  statusField: true,
  dateField: "startTime",
  relationFilters: { class: "classId", subject: "subjectId" },
  relationInputs: {
    class: "classId",
    teacher: "teacherId",
    subject: "subjectId",
    room: "roomId",
  },
  dates: ["startTime", "endTime"],
  lists: ["videos"],
  orderBy: { startTime: "asc" },
  relatedRoutes: [
    { path: "/class/:classId", param: "classId", field: "classId" },
    { path: "/teacher/:teacherId", param: "teacherId", field: "teacherId" },
  ],
  authz: {
    readRoles: [...STAFF_ROLES, "parent", "student"],
    writeRoles: STAFF_ROLES,
    readScope: async (req, where) => {
      await scopeLessonsForTeacher(req, where);
      await scopeLessonsForParent(req, where);
      await scopeLessonsForStudent(req, where);
    },
    readOneScope: assertLessonReadAccess,
    writeScope: async (req, mode, target, payload) => {
      if (req.user?.role !== "teacher") return;

      if (mode === "delete") {
        if (target.teacherId !== req.user.id) {
          throw forbidden("You can only delete lessons you teach");
        }
        return;
      }

      if (mode === "create") {
        // Ownership is always forced: a teacher cannot create a lesson that
        // is registered to a different teacher.
        target.teacherId = req.user.id;
        await assertTeacherClass(req, target.classId);
        return;
      }

      // update
      if (target.teacherId !== req.user.id) {
        throw forbidden("You can only edit lessons you teach");
      }
      if (payload && payload.teacherId !== undefined && payload.teacherId !== req.user.id) {
        payload.teacherId = req.user.id;
      }
      if (target.classId) await assertTeacherClass(req, target.classId);
    },
  },
  beforeWrite: assertLessonSchedule,
});

// ---------------------------------------------------------------------------
// GET /exams
// ---------------------------------------------------------------------------
export const examsRouter = crudRouter({
  delegate: "exam",
  include: {
    lesson: {
      select: {
        id: true,
        name: true,
        day: true,
        startTime: true,
        endTime: true,
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    },
  },
  searchable: ["name"],
  relationFilters: { lesson: "lessonId" },
  relationInputs: { lesson: "lessonId" },
  dates: ["startTime", "endTime"],
  dateField: "startTime",
  postWhere: (where, query) => applyAfterDateFilter(where, query, "startsAfter", "startTime"),
  orderBy: { startTime: "desc" },
  authz: {
    readRoles: [...STAFF_ROLES, "parent", "student"],
    writeRoles: STAFF_ROLES,
    readScope: async (req, where) => {
      await scopeByLessonForTeacher(req, where);
      await scopeAcademicForParent(req, where);
      await scopeAcademicForStudent(req, where);
    },
    readOneScope: assertParentAcademicItem,
    writeScope: async (req, mode, target, payload) => {
      if (req.user?.role !== "teacher") return;
      if (mode === "delete") {
        if (target.lessonId) await assertTeacherLesson(req, target.lessonId);
        return;
      }
      await assertTeacherLesson(req, payload?.lessonId ?? target.lessonId);
    },
  },
});

// ---------------------------------------------------------------------------
// GET /assignments
// ---------------------------------------------------------------------------
export const assignmentsRouter = crudRouter({
  delegate: "assignment",
  include: {
    lesson: {
      select: {
        id: true,
        name: true,
        day: true,
        startTime: true,
        endTime: true,
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    },
  },
  searchable: ["name"],
  relationFilters: { lesson: "lessonId" },
  relationInputs: { lesson: "lessonId" },
  dates: ["startDate", "dueDate"],
  dateField: "startDate",
  postWhere: (where, query) => applyAfterDateFilter(where, query, "dueAfter", "dueDate"),
  orderBy: { startDate: "desc" },
  authz: {
    readRoles: [...STAFF_ROLES, "parent", "student"],
    writeRoles: STAFF_ROLES,
    readScope: async (req, where) => {
      await scopeByLessonForTeacher(req, where);
      await scopeAcademicForParent(req, where);
      await scopeAcademicForStudent(req, where);
    },
    readOneScope: assertParentAcademicItem,
    writeScope: async (req, mode, target, payload) => {
      if (req.user?.role !== "teacher") return;
      if (mode === "delete") {
        if (target.lessonId) await assertTeacherLesson(req, target.lessonId);
        return;
      }
      await assertTeacherLesson(req, payload?.lessonId ?? target.lessonId);
    },
  },
});
