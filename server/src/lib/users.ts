import { prisma } from "../config/prisma";
import { AuthModel } from "./jwt";
import { isObjectId } from "./query";
import { mapDoc, stripSecrets } from "./serialize";

/**
 * Users live in four different models, so an id coming from a token, a
 * conversation or a ban request is polymorphic: it has to be resolved against
 * Admin, Teacher, Student and Parent in turn. Every cross-model lookup in the
 * API goes through this module.
 */
export const USER_MODELS: AuthModel[] = ["Admin", "Teacher", "Student", "Parent"];

export const USER_DELEGATES: Record<AuthModel, any> = {
  Admin: prisma.admin,
  Teacher: prisma.teacher,
  Student: prisma.student,
  Parent: prisma.parent,
  // Drivers authenticate too, but are deliberately NOT part of USER_MODELS:
  // they are not offered in the chat directory.
  Driver: prisma.driver,
};

export interface LocatedUser {
  id: string;
  model: AuthModel;
  /** The raw Prisma document (still contains `password`). */
  doc: any;
}

/** Looks a single id up across all four user models; `null` when unknown. */
export const findUserById = async (id: unknown): Promise<LocatedUser | null> => {
  if (!isObjectId(id)) return null;

  for (const model of USER_MODELS) {
    const doc = await USER_DELEGATES[model].findUnique({ where: { id } });
    if (doc) return { id: doc.id, model, doc };
  }

  return null;
};

/** Resolves a batch of ids (participant lists, ...) in one pass. */
export const findUsersByIds = async (
  ids: string[]
): Promise<Map<string, LocatedUser>> => {
  const unique = [...new Set(ids.filter((id) => isObjectId(id)))];
  const found = new Map<string, LocatedUser>();

  await Promise.all(
    unique.map(async (id) => {
      const located = await findUserById(id);
      if (located) found.set(id, located);
    })
  );

  return found;
};

export interface DirectoryQuery {
  /** Case-insensitive substring matched against fullName / username. */
  q?: string;
  /** The signed-in user, who is never listed. */
  excludeId?: string;
  limit?: number;
}

/**
 * Up to `limit` (max 20) users across all four models. An empty query returns
 * the first matches so the client's "new chat" picker always has options.
 */
export const searchUsers = async ({
  q = "",
  excludeId,
  limit = 20,
}: DirectoryQuery): Promise<LocatedUser[]> => {
  const needle = q.trim();
  const where = needle
    ? {
        OR: [
          { fullName: { contains: needle, mode: "insensitive" } },
          { username: { contains: needle, mode: "insensitive" } },
        ],
      }
    : {};
  const take = Math.min(Math.max(Math.trunc(limit) || 20, 1), 20);

  const located: LocatedUser[] = [];

  for (const model of USER_MODELS) {
    const docs = await USER_DELEGATES[model].findMany({
      where,
      orderBy: { fullName: "asc" },
      take,
    });

    for (const doc of docs) {
      if (doc.id === excludeId) continue;
      located.push({ id: doc.id, model, doc });
    }
  }

  return located
    .sort((a, b) => String(a.doc.fullName).localeCompare(String(b.doc.fullName)))
    .slice(0, take);
};

/** The participant shape embedded in conversations and directories. */
export const userSummary = (located: LocatedUser) => ({
  _id: located.doc.id,
  fullName: located.doc.fullName,
  profilePhoto: located.doc.profilePhoto ?? "",
  role: located.doc.role,
  model: located.model,
});

/** A full user document (no password) tagged with the model it came from. */
export const locatedToPublic = (located: LocatedUser) => ({
  ...mapDoc(stripSecrets(located.doc)),
  model: located.model,
});

export default findUserById;
