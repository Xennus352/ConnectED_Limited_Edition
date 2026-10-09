import { RequestHandler } from "express";

import { prisma } from "../config/prisma";
import { unauthorized } from "../lib/errors";
import { AuthModel, verifyToken } from "../lib/jwt";

export interface AuthUser {
  id: string;
  role: string;
  model: AuthModel;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const extractToken = (header?: string): string | null => {
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token;

  return header.trim() || null;
};

/**
 * Validates the `Authorization: Bearer <jwt>` header attached by the client.
 * Everything but `/health` and `/auth/sign-in` sits behind this middleware.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) throw unauthorized("Missing access token");

    const payload = verifyToken(token);

    const delegates: Record<AuthModel, any> = {
      Admin: prisma.admin,
      Teacher: prisma.teacher,
      Student: prisma.student,
      Parent: prisma.parent,
      Driver: prisma.driver,
    };

    const user = await delegates[payload.model]?.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true, isBanned: true },
    });

    if (!user) throw unauthorized("Your account no longer exists");
    if (user.isBanned === true) {
      throw unauthorized("Your account has been banned");
    }
    if (user.isActive === false) throw unauthorized("Your account is disabled");

    req.user = { id: user.id, role: user.role, model: payload.model };
    next();
  } catch (error: any) {
    switch (error?.name) {
      case "TokenExpiredError":
        next(unauthorized("Your session expired, please sign in again"));
        return;
      case "JsonWebTokenError":
      case "NotBeforeError":
        next(unauthorized("Invalid access token"));
        return;
      default:
        next(error);
    }
  }
};

/** Rejects the request unless the signed-in role is one of `roles`. */
export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, res, next) => {
    const role = req.user?.role?.toLowerCase?.();
    if (!role || !roles.includes(role)) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    next();
  };

export default requireAuth;
