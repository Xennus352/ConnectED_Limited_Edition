import { asyncHandler } from "../../lib/async-handler";
import { badRequest, forbidden, unauthorized } from "../../lib/errors";
import { comparePassword } from "../../lib/password";
import { signToken, AuthModel } from "../../lib/jwt";
import { mapDoc, stripSecrets } from "../../lib/serialize";
import { prisma } from "../../config/prisma";

const delegates: Array<{ model: AuthModel; client: any }> = [
  { model: "Admin", client: prisma.admin },
  { model: "Teacher", client: prisma.teacher },
  { model: "Student", client: prisma.student },
  { model: "Parent", client: prisma.parent },
  // Drivers authenticate against the same username/password flow so the
  // GPS tracker on /driver/location can carry a real JWT.
  { model: "Driver", client: prisma.driver },
];

const studentIncludes = {
  class: { select: { id: true, name: true, capacity: true } },
};

const teacherIncludes = {
  primaryClass: { select: { id: true, name: true } },
};

const parentIncludes = {
  children: {
    include: {
      class: { select: { id: true, name: true, capacity: true } },
    },
  },
};

// Drivers need their assigned bus + route on /driver/location immediately.
const driverIncludes = {
  bus: {
    select: {
      id: true,
      busNumber: true,
      name: true,
      registrationNumber: true,
      status: true,
      routeId: true,
      currentLatitude: true,
      currentLongitude: true,
      currentSpeed: true,
      heading: true,
      lastLocationAt: true,
      route: { select: { id: true, name: true, estimatedDuration: true } },
    },
  },
};

const includesFor = (model: AuthModel) => {
  if (model === "Student") return studentIncludes;
  if (model === "Teacher") return teacherIncludes;
  if (model === "Parent") return parentIncludes;
  if (model === "Driver") return driverIncludes;
  return undefined;
};

/**
 * POST /api/auth/sign-in
 * body: { username, password }
 * ->    { success, message, data: { token, user } }
 */
export const signIn = asyncHandler(async (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    throw badRequest("Username and password are required");
  }

  let found: any = null;
  let model: AuthModel | null = null;

  for (const entry of delegates) {
    const candidate = await entry.client.findUnique({ where: { username } });
    if (candidate) {
      found = candidate;
      model = entry.model;
      break;
    }
  }

  const invalid = unauthorized("Invalid username or password");

  if (!found || !model) throw invalid;

  const matches = await comparePassword(password, found.password);
  if (!matches) throw invalid;

  if (found.isBanned === true) {
    throw forbidden("Your account has been banned");
  }

  if (found.isActive === false) {
    throw unauthorized("This account has been disabled");
  }

  const user = await (prisma as any)[
    model.toLowerCase()
  ].findUnique({ where: { id: found.id }, include: includesFor(model) });

  const token = signToken(
    { sub: user.id, role: user.role, model },
    req.body?.rememberMe === true
  );

  res.json({
    success: true,
    message: `Welcome back, ${user.fullName}`,
    data: {
      token,
      user: stripSecrets(mapDoc(user)),
    },
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const auth = req.user;
  if (!auth) throw unauthorized();

  const entry = delegates.find((item) => item.model === auth.model);
  const user = await entry?.client.findUnique({
    where: { id: auth.id },
    include: includesFor(auth.model),
  });

  if (!user) throw unauthorized("Your account no longer exists");

  res.json({ success: true, data: stripSecrets(mapDoc(user)) });
});
