import { prisma } from "../../config/prisma";
import { mapDoc } from "../../lib/serialize";
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
});

// ---------------------------------------------------------------------------
// GET /rooms
// ---------------------------------------------------------------------------
export const roomsRouter = crudRouter({
  delegate: "room",
  searchable: ["name"],
  dates: [],
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
});
