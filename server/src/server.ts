import http from "http";
import { Server } from "socket.io";

import config from "./config/env";
import { prisma } from "./config/prisma";
import { createApp } from "./app";
import { setupSockets } from "./sockets";
import { startFleetSimulator, stopFleetSimulator } from "./modules/transportation/fleet-simulator";

const app = createApp();

// Attach Socket.IO on top of the express http server (same port 8000).
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});
setupSockets(io);

const banner = () => {
  console.log("");
  console.log("  ┌──────────────────────────────────────────┐");
  console.log("  │            ConnectED API                 │");
  console.log("  └──────────────────────────────────────────┘");
  console.log(`  http://localhost:${config.port}/api/health`);
  console.log(`  listening on 0.0.0.0:${config.port}`);
  console.log("");
};

const server = httpServer.listen(config.port, async () => {
  banner();

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    console.log(`  ✔ mongodb ready (${config.databaseUrl})`);
  } catch (error: any) {
    console.error("  ✖ mongodb is not reachable:", error?.message);
    console.error("    start it with:  docker compose up -d");
  }

  // Demo GPS: keep seeded buses reporting (and RUNNING buses moving) so the
  // live map is populated out of the box. Optional via env.
  if (config.fleetSimulationEnabled) {
    try {
      startFleetSimulator();
      console.log("  ✔ fleet GPS simulator running (FLEET_SIMULATION_ENABLED=true)");
    } catch (error: any) {
      console.error("  ✖ fleet simulator failed to start:", error?.message);
    }
  }

  console.log("");
});

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received, shutting down...`);
  stopFleetSimulator();

  // Force-exit if close hangs on open connections (socket.io / keep-alive).
  const forceExit = setTimeout(() => {
    console.error("  ✖ shutdown timed out, forcing exit");
    process.exit(0);
  }, 3000);
  forceExit.unref();

  // Stop accepting + destroy lingering connections so close() can fire.
  io.close();
  httpServer.closeAllConnections?.();

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[connect-ed] unhandled rejection:", reason);
});

export default app;