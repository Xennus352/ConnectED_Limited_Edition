import path from "path";
import cors from "cors";
import express, { Router } from "express";
import morgan from "morgan";

import config from "./config/env";
import { requireAuth, requireRole } from "./middlewares/auth.middleware";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware";

import { me, signIn } from "./modules/auth/auth.routes";
import { analytics } from "./modules/analytics/analytics.routes";
import { uploadRouter } from "./modules/upload/upload.routes";
import {
  adminsRouter,
  parentsRouter,
  studentsRouter,
  teachersRouter,
  driversRouter,
} from "./modules/users/users.routes";
import { usersRouter } from "./modules/users/users.router";
import { conversationsRouter } from "./modules/chat/chat.routes";
import {
  assignmentsRouter,
  classesRouter,
  examsRouter,
  lessonsRouter,
  roomsRouter,
  subjectsRouter,
} from "./modules/academic/academic.routes";
import {
  announcementsRouter,
  attendancesRouter,
  eventsRouter,
  resultsRouter,
} from "./modules/records/records.routes";
import {
  busesRouter,
  routesRouter,
  routeStopsRouter,
  busAssignmentsRouter,
  busLocationRouter,
  transportCustomRouter,
  busAdminRouter,
  fuelRouter,
  incidentsRouter,
  maintenanceRouter,
  reportsRouter,
  tripsAdminRouter,
  tripsRouter,
} from "./modules/transportation/transportation.routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use(
    cors({
      origin: config.clientOrigins.length
        ? config.clientOrigins
        : true, // `true` reflects any origin — convenient while developing
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // Uploaded avatars / subject covers
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "..", "uploads"))
  );

  const api = Router();

  api.get("/health", (_req, res) => {
    res.json({
      success: true,
      name: config.name,
      status: "up",
      time: new Date().toISOString(),
    });
  });

  // --- public ------------------------------------------------------------
  api.post("/auth/sign-in", signIn);

  // --- everything below needs a valid token -------------------------------
  api.use(requireAuth);

  api.get("/auth/me", me);
  api.get("/analytics", analytics);
  api.use("/upload", uploadRouter);

  api.use("/admins", adminsRouter);
  api.use("/teachers", teachersRouter);
  api.use("/students", studentsRouter);
  api.use("/parents", parentsRouter);
  api.use("/drivers", driversRouter);

  api.use("/users", usersRouter);
  api.use("/conversations", conversationsRouter);

  // Scoped + telemetry endpoints FIRST: they own `/buses/:id/track` and the
  // driver GPS routes, which must not fall into the admin-only CRUD guard
  // below (the guard applies to unmatched paths only).
  api.use("/", transportCustomRouter);

  // Raw transportation CRUD is an administration surface: current bus
  // coordinates, GPS history and student assignments must never be readable
  // by arbitrary signed-in roles. Everyone else goes through the scoped
  // endpoints above (`/admin/fleet`, `/parent/fleet`, `/driver/bus`,
  // `/buses/:id/track`), which filter by role before returning anything.
  const fleetAdmins = requireRole("admin", "super-admin");

  // Advanced administration routers: workflow endpoints (tripsAdminRouter)
  // and safe-delete overrides (busAdminRouter) are mounted BEFORE their
  // generic CRUD counterparts so they win the route match.
  api.use("/maintenance", fleetAdmins, maintenanceRouter);
  api.use("/trips", fleetAdmins, tripsAdminRouter);
  api.use("/trips", fleetAdmins, tripsRouter);
  api.use("/fuel", fleetAdmins, fuelRouter);
  api.use("/incidents", fleetAdmins, incidentsRouter);
  api.use("/reports", fleetAdmins, reportsRouter);
  api.use("/buses", fleetAdmins, busAdminRouter);
  api.use("/buses", fleetAdmins, busesRouter);
  api.use("/routes", fleetAdmins, routesRouter);
  api.use("/route-stops", fleetAdmins, routeStopsRouter);
  api.use("/bus-assignments", fleetAdmins, busAssignmentsRouter);
  api.use("/bus-locations", fleetAdmins, busLocationRouter);

  api.use("/classes", classesRouter);
  api.use("/rooms", roomsRouter);
  api.use("/subjects", subjectsRouter);
  api.use("/lessons", lessonsRouter);
  api.use("/exams", examsRouter);
  api.use("/assignments", assignmentsRouter);

  api.use("/results", resultsRouter);
  api.use("/attendances", attendancesRouter);
  api.use("/announcements", announcementsRouter);
  api.use("/events", eventsRouter);

  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
