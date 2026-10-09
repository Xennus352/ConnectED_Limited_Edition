/**
 * End-to-end verification of the realtime fleet pipeline (spec §30).
 *
 *   node scripts/verify-fleet.mjs
 *
 * Requires the API to be running (pnpm dev:server) and the database seeded
 * (pnpm --filter ./server run setup). It drives the real HTTP + Socket.IO
 * surface — no mocks, no simulated bus on the server side:
 *
 *   1. signs in admin / driver / two parents / a student
 *   2. opens authenticated sockets for each of them
 *   3. driver starts a trip and posts a real GPS fix
 *   4. asserts `bus:location` reaches ONLY authorized subscribers
 *   5. driver stops the trip and `bus:status` is asserted the same way
 *   6. asserts parent snapshot scoping (no foreign buses, no foreign names)
 *
 * Exit code 0 = every assertion passed.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { io } = require("../client/node_modules/socket.io-client");

const API = process.env.API_BASE_URL || "http://localhost:8000/api";
const SOCKET_ORIGIN = API.replace(/\/api$/, "");

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const signIn = async (username, password) => {
  const res = await fetch(`${API}/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  if (!body?.data?.token) throw new Error(`sign-in failed for ${username}`);
  return body.data;
};

const api = async (path, token, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res.json();
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(SOCKET_ORIGIN, {
      transports: ["websocket"],
      auth: { token },
      reconnection: false,
      timeout: 5000,
    });
    const timer = setTimeout(() => reject(new Error("socket connect timeout")), 5000);
    socket.on("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  console.log("\nConnectED fleet end-to-end verification\n");

  const admin = await signIn("admin", "Admin@123");
  const driver = await signIn("driver", "Driver@123");
  const parentA = await signIn("parent", "Parent@123"); // children on BUS-01/02
  const parentB = await signIn("parent2", "Parent@123"); // children on BUS-03/04
  const student = await signIn("student", "Student@123");
  console.log("signed in: admin, driver, parent, parent2, student\n");

  // ---- 1. snapshot scoping ---------------------------------------------
  console.log("Snapshot authorization");
  const adminFleet = await api("/admin/fleet", admin.token);
  const parentAFleet = await api("/parent/fleet", parentA.token);
  const parentBFleet = await api("/parent/fleet", parentB.token);
  const studentFleet = await api("/admin/fleet", student.token);

  const adminBuses = adminFleet?.data?.buses ?? [];
  const aBuses = (parentAFleet?.data?.buses ?? []).map((b) => b.busNumber).sort();
  const bBuses = (parentBFleet?.data?.buses ?? []).map((b) => b.busNumber).sort();

  check("admin sees the whole fleet", adminBuses.length === 4, `${adminBuses.length} buses`);
  check("parent sees only BUS-01/02", JSON.stringify(aBuses) === JSON.stringify(["BUS-01", "BUS-02"]), aBuses.join(","));
  check("parent2 sees only BUS-03/04", JSON.stringify(bBuses) === JSON.stringify(["BUS-03", "BUS-04"]), bBuses.join(","));
  check("student sees no buses", (studentFleet?.data?.buses ?? []).length === 0);

  const rawStudentBuses = await fetch(`${API}/buses`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  check("student blocked from raw /buses", rawStudentBuses.status === 403, `status ${rawStudentBuses.status}`);

  const trackDenied = await fetch(`${API}/buses/${(parentBFleet.data.buses[0] || {}).id}/track`, {
    headers: { Authorization: `Bearer ${parentA.token}` },
  });
  check(
    "parent denied a foreign vehicle's /track",
    parentBFleet?.data?.buses?.length > 0 ? trackDenied.status === 403 : false,
    `status ${trackDenied.status}`
  );

  // ---- 2. realtime rooms ------------------------------------------------
  console.log("\nRealtime delivery");
  const sockets = {};
  for (const [name, session] of Object.entries({ admin, parentA, parentB, student })) {
    sockets[name] = await connect(session.token);
  }
  await sleep(300); // let the server resolve room membership

  const events = { admin: [], parentA: [], parentB: [], student: [] };
  for (const name of Object.keys(events)) {
    sockets[name].on("bus:location", (payload) => events[name].push({ kind: "location", ...payload }));
    sockets[name].on("bus:status", (payload) => events[name].push({ kind: "status", ...payload }));
  }

  const myBus = await api("/driver/bus", driver.token);
  const busId = myBus?.data?.id;
  if (!busId) throw new Error("driver has no assigned bus");

  // ---- 3. driver starts the trip ---------------------------------------
  await api(`/buses/${busId}/start-trip`, driver.token, { method: "POST", body: "{}" });
  await sleep(400);

  const firstFix = {
    latitude: 43.241,
    longitude: 76.893,
    speed: 32,
    heading: 145,
    accuracy: 8,
  };
  await api(`/buses/${busId}/location`, driver.token, {
    method: "POST",
    body: JSON.stringify(firstFix),
  });
  await sleep(500);

  const locate = (name, id) => events[name].filter((e) => e.kind === "location" && e.busId === id);
  const statusOf = (name, id) => events[name].filter((e) => e.kind === "status" && e.busId === id);

  check("admin received bus:location", locate("admin", busId).length === 1, `${locate("admin", busId).length} event(s)`);
  check(
    "parent of a rider on that bus received bus:location",
    locate("parentA", busId).length === 1,
    `${locate("parentA", busId).length} event(s)`
  );
  check(
    "parent of a child on ANOTHER bus received nothing",
    locate("parentB", busId).length === 0,
    `${locate("parentB", busId).length} event(s)`
  );
  check("student received nothing", locate("student", busId).length === 0);

  const payload = locate("admin", busId)[0];
  const shapeOk =
    payload &&
    typeof payload.latitude === "number" &&
    typeof payload.longitude === "number" &&
    typeof payload.speed === "number" &&
    typeof payload.heading === "number" &&
    typeof payload.accuracy === "number" &&
    typeof payload.status === "string" &&
    typeof payload.timestamp === "string";
  check("payload matches the documented shape", Boolean(shapeOk));

  // ---- 4. current state persisted --------------------------------------
  const after = await api("/admin/fleet", admin.token);
  const updated = (after?.data?.buses ?? []).find((b) => b.id === busId);
  check(
    "database current state updated",
    updated?.latitude === 43.241 && updated?.longitude === 76.893 && updated?.speed === 32,
    `lat ${updated?.latitude}, lng ${updated?.longitude}`
  );
  check("status flipped to RUNNING", updated?.status === "RUNNING", updated?.status);

  // A second fix proves movement, not a one-off write.
  await api(`/buses/${busId}/location`, driver.token, {
    method: "POST",
    body: JSON.stringify({ latitude: 43.2415, longitude: 76.9742, speed: 28, heading: 150, accuracy: 6 }),
  });
  await sleep(400);
  check("second fix also delivered", locate("admin", busId).length === 2, `${locate("admin", busId).length} event(s)`);
  check(
    "second fix never reached the foreign parent",
    locate("parentB", busId).length === 0
  );

  // ---- 5. trip stop broadcasts status ----------------------------------
  await api(`/buses/${busId}/stop-trip`, driver.token, { method: "POST", body: "{}" });
  await sleep(500);

  check("admin received bus:status", statusOf("admin", busId).length >= 1);
  check("authorized parent received bus:status", statusOf("parentA", busId).length >= 1);
  check("foreign parent did NOT receive bus:status", statusOf("parentB", busId).length === 0);
  check("student did NOT receive bus:status", statusOf("student", busId).length === 0);

  const stopped = (await api("/admin/fleet", admin.token)).data.buses.find((b) => b.id === busId);
  check("status persisted as STOPPED", stopped?.status === "STOPPED", stopped?.status);

  // ---- 6. a driver cannot write someone else's bus ---------------------
  const otherBus = adminBuses.find((b) => b.id !== busId);
  const foreignWrite = await fetch(`${API}/buses/${otherBus.id}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${driver.token}` },
    body: JSON.stringify({ latitude: 1, longitude: 1 }),
  });
  check(
    "driver blocked from posting another bus's location",
    foreignWrite.status === 403,
    `status ${foreignWrite.status}`
  );

  for (const socket of Object.values(sockets)) socket.disconnect();

  console.log(
    failures === 0
      ? "\n✔ All realtime fleet checks passed.\n"
      : `\n✘ ${failures} check(s) failed.\n`
  );
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error("\n✘ Verification could not run:", error.message, "\n");
  process.exit(1);
});
