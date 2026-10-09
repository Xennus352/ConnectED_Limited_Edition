import { RequestHandler, Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { forbidden, notFound } from "../../lib/errors";
import { mapDoc } from "../../lib/serialize";
import {
  LocatedUser,
  USER_DELEGATES,
  USER_MODELS,
  findUserById,
  locatedToPublic,
  searchUsers,
} from "../../lib/users";
import { emitToUser } from "../../sockets";

/**
 * Routes served under `/api/users` (behind `requireAuth`):
 *
 * - GET   /api/users/banned        banned users across all four models (admins)
 * - PUT   /api/users/:id/ban       ban a user across all four models (admins)
 * - PUT   /api/users/:id/unban     lift the ban                      (admins)
 * - GET   /api/users/directory     contact picker for new chats (any signed-in user)
 */
export const usersRouter = Router();

const isAdmin = (req: { user?: { role?: string } }): boolean =>
  req.user?.role === "admin" || req.user?.role === "super-admin";

/** Only admins may list / change bans; everyone else gets 403. */
const requireAdmin: RequestHandler = asyncHandler(async (req, _res, next) => {
  if (!isAdmin(req)) {
    throw forbidden("Only administrators can manage bans");
  }
  next();
});

// ---------------------------------------------------------------------------
// GET /api/users/banned
// ---------------------------------------------------------------------------
usersRouter.get(
  "/banned",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const banned: LocatedUser[] = [];

    for (const model of USER_MODELS) {
      const docs = await USER_DELEGATES[model].findMany({
        where: { isBanned: true },
        orderBy: { createdAt: "desc" },
      });

      for (const doc of docs) banned.push({ id: doc.id, model, doc });
    }

    res.json({
      success: true,
      data: banned.map(locatedToPublic),
      meta: { total: banned.length, skip: 0, limit: banned.length, page: 1 },
    });
  })
);

// ---------------------------------------------------------------------------
// PUT /api/users/:id/ban  |  PUT /api/users/:id/unban
// ---------------------------------------------------------------------------
const setBan = (banned: boolean): RequestHandler =>
  asyncHandler(async (req, res) => {
    const located = await findUserById(req.params.id);
    if (!located) throw notFound("User not found");

    const updated = await USER_DELEGATES[located.model].update({
      where: { id: located.id },
      data: { isBanned: banned },
    });

    // The moment the ban lands, kick the banned user's live sockets so the
    // client signs out instantly instead of waiting for the next request.
    if (banned) emitToUser(located.id, "user:banned", { userId: located.id });

    res.json({
      success: true,
      data: { ...mapDoc(updated), model: located.model },
    });
  });

usersRouter.put("/:id/ban", requireAdmin, setBan(true));
usersRouter.put("/:id/unban", requireAdmin, setBan(false));

// ---------------------------------------------------------------------------
// GET /api/users/directory?q=&limit=
// ---------------------------------------------------------------------------
usersRouter.get(
  "/directory",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.trunc(rawLimit) : 20;

    const found = await searchUsers({
      q,
      excludeId: req.user?.id,
      limit,
    });

    res.json({
      success: true,
      data: found.map((located) => ({
        _id: located.doc.id,
        fullName: located.doc.fullName,
        username: located.doc.username,
        profilePhoto: located.doc.profilePhoto ?? "",
        role: located.doc.role,
        model: located.model,
      })),
      meta: { total: found.length, skip: 0, limit: limit, page: 1 },
    });
  })
);

export default usersRouter;