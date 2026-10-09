import { asyncHandler } from "../../lib/async-handler";
import { prisma } from "../../config/prisma";

const startOfDay = (input?: string) => {
  const base = input ? new Date(`${input}T00:00:00`) : new Date();
  const date = Number.isNaN(base.getTime()) ? new Date() : base;
  return {
    gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    lte: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  };
};

/**
 * GET /api/analytics?date=YYYY-MM-DD
 * Powers the admin dashboard cards and charts.
 */
export const analytics = asyncHandler(async (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const range = startOfDay(date);

  const [
    adminsCount,
    teachersCount,
    studentsCount,
    parentsCount,
    maleStudents,
    femaleStudents,
    classesCount,
    subjectsCount,
    roomsCount,
    lessonsCount,
    examsCount,
    assignmentsCount,
    resultsCount,
    announcementsCount,
    eventsCount,
    attendanceOnDate,
  ] = await Promise.all([
    prisma.admin.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.parent.count(),
    prisma.student.count({ where: { gender: "male" } }),
    prisma.student.count({ where: { gender: "female" } }),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.room.count(),
    prisma.lesson.count(),
    prisma.exam.count(),
    prisma.assignment.count(),
    prisma.result.count(),
    prisma.announcement.count(),
    prisma.event.count(),
    prisma.attendance.findMany({ where: { date: range }, select: { present: true } }),
  ]);

  const present = attendanceOnDate.filter((item) => item.present).length;

  res.json({
    success: true,
    data: {
      date: date ?? new Date().toISOString().split("T")[0],
      adminsCount,
      teachersCount,
      studentsCount,
      parentsCount,
      maleStudents,
      femaleStudents,
      classesCount,
      subjectsCount,
      roomsCount,
      lessonsCount,
      examsCount,
      assignmentsCount,
      resultsCount,
      announcementsCount,
      eventsCount,
      attendance: {
        present,
        absent: attendanceOnDate.length - present,
        total: attendanceOnDate.length,
      },
    },
  });
});

export default analytics;
