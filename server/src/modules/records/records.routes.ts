import { prisma } from "../../config/prisma";
import { mapDoc } from "../../lib/serialize";
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

// ---------------------------------------------------------------------------
// GET /results
// ---------------------------------------------------------------------------
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
});

// ---------------------------------------------------------------------------
// GET /attendances
// ---------------------------------------------------------------------------
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
});
