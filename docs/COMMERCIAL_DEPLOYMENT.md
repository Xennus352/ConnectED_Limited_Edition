# ConnectED — Commercial Deployment Guide

> **Audience:** whoever operates ConnectED for a paying school. Read this
> together with `docs/PRODUCTION_READINESS_CHECKLIST.md` and
> `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`. **The platform is not yet verified
> as production-ready**; treat this guide as the target procedure to follow once
> the readiness checklist is satisfied.
>
> Commands here are limited to what the repository actually provides. Where a
> production-grade step has **no existing script**, that is called out explicitly
> as a gap rather than invented.

Last updated: 2026-10-10.

---

## 0. Local development vs. production (read first)

| Concern | Local development (what the repo ships) | Production (what you must add) |
| --- | --- | --- |
| Mongo | `pnpm db:up` → Docker single-node replica set | Managed/HA MongoDB with auth, TLS, backups |
| Schema | `prisma db push` (no migration history) | Versioned migrations + staged rollout |
| Secrets | `.env` with example values | Managed secret store, strong `JWT_SECRET` |
| HTTPS | none (http://localhost) | TLS termination at a reverse proxy/proxy |
| CORS | empty = reflect any origin | explicit `CLIENT_ORIGINS` allow-list |
| GPS | demo simulator on by default | `FLEET_SIMULATION_ENABLED=false` |
| Uploads | local disk, public `/uploads` | private storage + authenticated delivery |
| Realtime | single Node instance | sticky sessions + Socket.IO adapter |

---

## 1. Prerequisites

- **Node.js:** use a current LTS release (20.x or 22.x). The repository does
  **not** pin a version (no `engines` field, no `.nvmrc`), so pin one for your
  deployment and test it.
- **Package manager:** **pnpm** (the repo is a pnpm workspace —
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`). `pnpm-workspace.yaml` allow-lists
  build scripts for Prisma and esbuild; keep that in place.
- **MongoDB 7.** Prisma transactions require a **replica set**. The bundled
  `docker-compose.yml` / `scripts/db.sh` start a single-node replica set
  (`rs0`) for development.
- **A static host** for the built client, or the Node server fronted by a proxy.
- **A reverse proxy** (nginx/Caddy/etc.) for TLS and WebSocket passthrough.

---

## 2. Environment configuration

### 2.1 Server (`server/.env`)

Start from `server/.env.example` (do not commit the real `.env`; it is
gitignored).

| Variable | Example / default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | API + Socket.IO port |
| `DATABASE_URL` | `mongodb://127.0.0.1:27017/connected` | Prisma MongoDB connection |
| `JWT_SECRET` | *(example only)* | HS256 signing key — **set a long random value** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime (`rememberMe` extends to 30d) |
| `CLIENT_ORIGINS` | `http://localhost:5173,...` | CORS allow-list (comma separated). **Empty reflects any origin — set it in production.** |
| `PUBLIC_URL` | `http://localhost:8000` | Base for generated links (uploads) |
| `FRESH_LOCATION_SECONDS` | `15` | Bus "LIVE" threshold |
| `DELAYED_LOCATION_SECONDS` | `60` | "DELAYED" threshold |
| `STALE_LOCATION_SECONDS` | `300` | "STALE"→"OFFLINE" threshold |
| `MAP_TILE_URL` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Raster tile template |
| `MAP_TILE_ATTRIBUTION` | `&copy; OpenStreetMap contributors` | Map attribution |
| `MAP_CENTER_LATITUDE` | `18.9398` | Fallback map centre (env example uses Myanmar) |
| `MAP_CENTER_LONGITUDE` | `96.4310` | Fallback map centre |
| `MAP_DEFAULT_ZOOM` | `14` | Fallback zoom |
| `FLEET_SIMULATION_ENABLED` | `true` (code default) | **Demo GPS simulator — set `false` in production** |
| `FLEET_SIMULATION_TICK_SECONDS` | `4` | Simulator tick |
| `NODE_ENV` | *(unset)* | `production` switches Morgan to `combined` |

> **Gap:** `FLEET_SIMULATION_ENABLED` and `FLEET_SIMULATION_TICK_SECONDS` are read
> by the code but are **not** listed in `server/.env.example` (a commented note
> has been added). Make sure they are set for your environment.

### 2.2 Client (`client/.env`)

The client reads these at **build time** (Vite `import.meta.env`):

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | REST base URL (also used to derive the Socket.IO URL) |
| `VITE_DRIVER_DISPATCH_PHONE` | *(optional)* | Phone number shown on the driver dashboard |

Copy `client/.env.example` (added) to `client/.env`. Because these are inlined at
build time, **rebuild the client** whenever they change.

---

## 3. Database provisioning and schema

### 3.1 Development (as shipped)

```bash
pnpm db:up        # start MongoDB (Docker, replica set rs0)
pnpm db:setup     # prisma generate + db push + seed (--force)
```

Root scripts (from the root `package.json`):

| Script | Effect |
| --- | --- |
| `pnpm dev` | Run client + server in parallel |
| `pnpm build` | Build all workspaces |
| `pnpm db:up` / `pnpm db:down` | Start/stop MongoDB (`scripts/db.sh`) |
| `pnpm db:setup` | `prisma generate && prisma db push && tsx prisma/seed.ts --force` |
| `pnpm db:reset` | `prisma db push --force-reset` + seed |
| `pnpm db:studio` | Prisma Studio |

Server scripts (`server/package.json`): `dev`, `build`, `start`, `typecheck`,
`setup`, `db:generate`, `db:push`, `db:seed`, `db:reset`, `db:studio`.

### 3.2 Production — important gaps

- **No migration history.** The project uses `prisma db push` (schema sync), not
  `prisma migrate`. For a commercial deployment you should adopt versioned
  migrations (`prisma migrate`) so schema changes are reviewable, repeatable, and
  reversible. This is a **process change to be scheduled**, not something the
  current scripts do.
- **Seeding is destructive.** `pnpm db:setup` / `db:reset` run the seed with
  `--force`. **Never run these against production data.** The seed creates demo
  schools data that must not exist in a real deployment.
- **Bootstrapping the first administrator is not a supported command.** The seed
  creates demo admins; there is no dedicated "create production admin" CLI. You
  must either (a) provide a one-off, reviewed bootstrap script, or (b) insert the
  first admin safely and then create further accounts through the API. Document
  and test whichever you choose.
- Enable **authentication + TLS** on MongoDB before it is reachable off-host.

---

## 4. Build and run

### 4.1 Server

```bash
pnpm install
pnpm --filter ./server build      # tsc -> server/dist
NODE_ENV=production node server/dist/server.js
```

The server also serves uploaded files at `/uploads` and hosts Socket.IO on the
same `PORT`.

### 4.2 Client

```bash
pnpm --filter ./client build      # tsc -b && vite build -> client/dist
```

Serve `client/dist` as static files. It is a **single-page app**, so all unknown
paths must fall back to `index.html` (the repo includes `client/vercel.json` with
exactly this rewrite; reproduce it in nginx/Caddy/etc.:

```nginx
location / {
  try_files $uri /index.html;
}
```

### 4.3 Health check

`GET /api/health` (public) → `{ success, name: "ConnectED", status: "up", time }`.
Use it for load-balancer / uptime checks.

---

## 5. HTTPS, domains, and proxying

- Terminate TLS at a reverse proxy and forward to the Node port.
- Put the API on its own host/subdomain (e.g. `api.school.example`) and set
  `CLIENT_ORIGINS` to the exact client origin(s). Do **not** leave it empty.
- **WebSockets:** Socket.IO runs on the same port. Configure the proxy to
  upgrade and forward `Upgrade`/`Connection` headers, or the realtime features
  (chat, live bus map, ban events) will fail.
- If you run **more than one** server instance, add sticky sessions **and** a
  Socket.IO adapter (e.g. Redis); the default in-memory adapter only works for a
  single instance.

---

## 6. Secret management

- Generate a strong, unique `JWT_SECRET` (long random string) per environment.
  A forged secret means forged sessions.
- Keep the real `server/.env` and `client/.env` **out of source control** (both
  are gitignored today). Load secrets from a managed store (Docker secrets,
  cloud secret manager, or equivalent) in production.
- Rotate demo credentials and any credentials that appeared in development.
- Never place map-provider keys or database URLs in source; use environment
  variables (the map env vars already support this).

---

## 7. File storage

- Uploads are written to the server filesystem (`server/uploads`) and served
  statically at `/uploads`.
- **Access-control gap (F-07):** uploaded files are currently **public**. Before
  handling real school data, serve uploads through an authenticated/authorized
  path (or short-lived signed URLs). See `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`.
- Back up the uploads directory alongside the database, and mount it on
  persistent storage (not the container's ephemeral layer).

---

## 8. Realtime (Socket.IO)

- Same port as REST; the client connects with the same JWT
  (`client/src/lib/socket.ts`).
- Handshake verifies the token; authorized rooms are joined server-side.
- For multi-instance deployments, see §5 (adapter + sticky sessions).
- **Gap (F-14):** the socket handshake does not re-check `isBanned`/`isActive`
  from the database the way REST does.

---

## 9. Transportation / GPS

- Freshness thresholds and map tiles are configured by env (see §2).
- **Disable the demo simulator in production:**
  `FLEET_SIMULATION_ENABLED=false`. Otherwise the server fabricates bus movement.
- Real tracking requires devices/drivers to post positions; do not advertise
  guaranteed GPS accuracy or arrival times.
- Review the map tile provider's terms for commercial use (the community OSM
  tile servers are not intended for high-volume commercial traffic).

---

## 10. Database backups and restore

There is **no backup script in the repository.** Use your database platform's
backups, or the standard MongoDB tooling (`mongodump` / `mongorestore`) run
against the deployment — clearly outside the project's own scripts:

```bash
# Illustrative standard MongoDB tooling — not a repository script.
mongodump  --uri "$DATABASE_URL" --out /backups/connected-$(date +%F)
mongorestore --uri "$DATABASE_URL" /backups/connected-YYYY-MM-DD
```

Define and **test** an RPO/RTO, schedule backups, store them encrypted and off
the primary host, and verify restores regularly. Back up the uploads directory
too.

---

## 11. Logging and monitoring

- HTTP logging is via **Morgan**; `NODE_ENV=production` switches to the
  `combined` format.
- Application errors are logged to stdout/stderr. Some error paths log full
  error objects (see audit F-12); review what reaches logs to avoid unnecessary
  personal data.
- Add: uptime/health monitoring on `/api/health`, error tracking, log
  aggregation, and alerting. None is configured in the repo.
- Avoid logging tokens, passwords, or personal data.

---

## 12. Upgrade and rollback

1. Review the diff and third-party changes (`pnpm-lock.yaml`).
2. Build and run tests/lint/typecheck (see the readiness checklist).
3. Back up the database and uploads.
4. Deploy the new server build; apply any schema change through migrations
   (once adopted — see §3.2).
5. Deploy the new client build.
6. Verify `/api/health`, sign-in, and a realtime event.
7. **Rollback:** redeploy the previous build artifacts and restore the database
   if a migration changed data. Keep the previous release available.

---

## 13. Initial school setup and onboarding

> Because the platform is **single-tenant** today (no school/organization model —
> see the audit §3), each school should get its **own deployment** until
> multi-tenancy exists. Do not point two schools at one database.

1. Provision the deployment (server + database + client) and set environment
   variables (§2).
2. Run the schema setup (production-safe path — not the destructive demo seed).
3. Create the first administrator (see the §3.2 bootstrap gap).
4. Create classes, rooms, and subjects through the admin UI/API.
5. Create teacher, student, parent, and driver accounts; link students to their
   classes and parents; assign buses and routes as needed.
6. Configure branding, map tiles, and location thresholds.
7. Train administrators/teachers; distribute the parent/student portal URLs.

---

## 14. Incident response and support

- Define who is on call, how incidents are reported, and the notification
  timeline for security incidents affecting school data (see
  `TERMS_OF_SERVICE.md` §10).
- Keep a documented contact for the school and for the provider.
- Preserve logs and evidence on suspected security incidents; follow applicable
  breach-notification law.

---

## 15. Production checklist pointer

Before going live for a paying school, complete
`docs/PRODUCTION_READINESS_CHECKLIST.md`.
