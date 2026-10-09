import { Request } from "express";

import { prisma } from "../../config/prisma";
import { badRequest, forbidden } from "../../lib/errors";
import { isObjectId } from "../../lib/query";
import { mapDoc } from "../../lib/serialize";
import {
  ADMIN_ROLES,
  STAFF_ROLES,
  assertTeacherClass,
  pushScope,
  teacherClassIds,
} from "../../lib/authz";
import { crudRouter } from "../shared/crud";

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
    readRoles: STAFF_ROLES,
    writeRoles: STAFF_ROLES,
    readScope: scopeLessonsForTeacher,
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
      select: { id: true, name: true, day: true, startTime: true, endTime: true },
    },
  },
  searchable: ["name"],
  relationFilters: { lesson: "lessonId" },
  relationInputs: { lesson: "lessonId" },
  dates: ["startTime", "endTime"],
  dateField: "startTime",
  orderBy: { startTime: "desc" },
  authz: {
    writeRoles: STAFF_ROLES,
    readScope: scopeByLessonForTeacher,
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
      select: { id: true, name: true, day: true, startTime: true, endTime: true },
    },
  },
  searchable: ["name"],
  relationFilters: { lesson: "lessonId" },
  relationInputs: { lesson: "lessonId" },
  dates: ["startDate", "dueDate"],
  dateField: "startDate",
  orderBy: { startDate: "desc" },
  authz: {
    writeRoles: STAFF_ROLES,
    readScope: scopeByLessonForTeacher,
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