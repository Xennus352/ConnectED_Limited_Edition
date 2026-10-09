import { Request } from "express";

import { prisma } from "../config/prisma";
import { forbidden } from "./errors";

/** Roles allowed to manage academic records. */
export const STAFF_ROLES = ["admin", "super-admin", "teacher"] as const;

/** Roles allowed to administer the school (users, rooms, subjects, fleet…). */
export const ADMIN_ROLES = ["admin", "super-admin"] as const;

export const isStaff = (req: Request): boolean =>
  Boolean(req.user && STAFF_ROLES.includes(req.user.role as any));

export const isAdmin = (req: Request): boolean =>
  Boolean(req.user && ADMIN_ROLES.includes(req.user.role as any));

/**
 * Rejects the request unless the signed-in role is one of `roles`.
 * Every academic write endpoint goes through this (or `assertRole`), so a
 * student, parent or driver can never mutate teacher-managed resources by
 * crafting an API request — hiding buttons in the UI is not enough.
 */
export const assertRole = (
  req: Request,
  roles: readonly string[]
): void => {
  const role = req.user?.role?.toLowerCase?.();
  if (!role || !roles.includes(role)) {
    throw forbidden("You do not have permission to perform this action");
  }
};

export const assertStaff = (req: Request): void => assertRole(req, STAFF_ROLES);

export const assertAdmin = (req: Request): void => assertRole(req, ADMIN_ROLES);

/**
 * Resolves the set of class ids a teacher is authorized for:
 *
 * - classes they are the class teacher of (`Class.teacher`),
 * - classes in `assignedClassIds` (timetable assignments),
 * - their `primaryClass`,
 * - any class they are timetable-ed into through a lesson they teach.
 *
 * The returned set is used to scope both reads and writes, so a teacher can
 * never address a record belonging to another class by changing an id in the
 * request body/query.
 */
export const teacherClassIds = async (
  teacherId: string
): Promise<Set<string>> => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, primaryClassId: true, assignedClassIds: true },
  });
  if (!teacher) return new Set<string>();

  const [classTeachers, taughtLessons] = await Promise.all([
    prisma.class.findMany({
      where: { OR: [{ teacherId }, { id: { in: teacher.assignedClassIds } }] },
      select: { id: true },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      distinct: ["classId"],
      select: { classId: true },
    }),
  ]);

  const ids: string[] = classTeachers.map((c) => c.id);
  taughtLessons.forEach((l) => l.classId && ids.push(l.classId));
  if (teacher.primaryClassId) ids.push(teacher.primaryClassId);

  return new Set(ids);
};

/**
 * Convenience: scopes a class filter to a teacher's authorized classes.
 * When the client already asked for a specific class the filter is replaced
 * wholesale — asking for a class outside the scope simply matches nothing
 * instead of leaking its records.
 */
export const scopeClassesForTeacher = async (
  req: Request,
  where: Record<string, any>
): Promise<void> => {
  if (req.user?.role !== "teacher") return;
  const scope = await teacherClassIds(req.user.id);
  if (!scope.size) {
    where.id = { in: [] };
    return;
  }
  where.id = { in: [...scope] };
};

/**
 * Throws unless `classId` belongs to the teacher's authorized set. Used by
 * single-record write scopes (create/update/delete) so a teacher cannot act
 * on a class they are not assigned to.
 */
export const assertTeacherClass = async (
  req: Request,
  classId: string | null | undefined
): Promise<void> => {
  if (req.user?.role !== "teacher") return;
  if (!classId) throw forbidden("A class is required for this operation");
  const scope = await teacherClassIds(req.user.id);
  if (!scope.has(String(classId))) {
    throw forbidden("You do not have access to this class");
  }
};