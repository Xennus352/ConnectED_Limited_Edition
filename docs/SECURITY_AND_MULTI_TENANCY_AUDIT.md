# ConnectED — Security & Multi-Tenancy Audit

> **Status: READ-ONLY STATIC REVIEW — NOT A PENETRATION TEST OR CERTIFICATION.**
> Produced 2026-10-10 by inspecting the source in this repository. No exploit
> was executed and no running system was attacked. Findings are based on code
> reading; they should be confirmed by dynamic testing before being treated as
> complete. This document must not be presented as evidence of compliance with
> any law or standard.

Scope: `/server` (Express + Prisma/MongoDB API, Socket.IO) and relevant client
behaviour. This audit answers the questions in the commercialization brief and
records gaps that must be closed before selling to multiple schools.

---

## 1. Verdict up front

- **The platform is single-tenant.** There is **no school / tenant / organization
  identifier anywhere** in the schema or queries. All data belongs to one
  implicit tenant. Selling to multiple schools requires a multi-tenancy design
  that does not exist today.
- **Authorization is substantial but has gaps.** Role checks and teacher/
  parent/student scoping exist via a shared CRUD layer, but some resources are
  readable by *any* authenticated role, drivers have broad academic access, and
  uploaded files are public.
- **Treat the platform as pre-production** until the High findings below are
  fixed and the readiness checklist is complete.

---

## 2. System summary (verified)

- **API:** Express 4 (`server/src/app.ts`), all routes under `/api`. Only
  `GET /api/health` and `POST /api/auth/sign-in` are public; everything else is
  behind `requireAuth` (`app.ts:95`).
- **AuthN:** Stateless JWT (HS256) with payload `{ sub, role, model }`
  (`server/src/lib/jwt.ts`). `requireAuth` re-loads the user from the DB and
  takes `role`/`isActive`/`isBanned` from the DB, not the token
  (`middlewares/auth.middleware.ts:50-61`) — good.
- **AuthZ:** Shared CRUD engine (`modules/shared/crud.ts`) with per-resource
  `readRoles`/`writeRoles` and `readScope`/`readOneScope`/`writeScope` hooks
  (`lib/authz.ts`).
- **Data:** MongoDB via Prisma (`prisma/schema.prisma`). Users are split across
  five models (`Admin`, `Teacher`, `Student`, `Parent`, `Driver`); many relations
  are stored as scalar id lists and joined in application code.
- **Realtime:** Socket.IO on the same port (`server/src/sockets.ts`); handshake
  verifies the JWT and joins role-scoped rooms.
- **Files:** `multer` disk uploads to `server/uploads`, served statically at
  `/uploads` (`app.ts:75-78`).

---

## 3. Multi-tenancy assessment

**There is no tenant concept.** Verified by:

- No `school`, `tenant`, `organization`, `orgId`, or `tenantId` field in the
  778-line `prisma/schema.prisma`; every model keys only off its own `id`.
- No tenant parameter in the query layer (`lib/query.ts`, `lib/authz.ts`) or in
  any CRUD options.
- The JWT carries no tenant/org claim (`lib/jwt.ts`).
- "admin"/"super-admin" are global roles (`lib/authz.ts:24`) that can read and
  write every record.

**Consequences for multi-school sales:**

- One deployment = one school (or one group that trusts a single global admin
  tier). Two schools on one deployment would see each other's data.
- Global uniqueness constraints complicate shared deployments: `username` is
  unique per model and matched across all five models at login
  (`auth.routes.ts:78-85`); `Bus.registrationNumber` is globally unique
  (`schema.prisma:427`).
- Global sequences/artifacts: maintenance ticket numbers are `MNT-<global
  count+1>` (`modules/transportation/maintenance.ts:184-185`); all uploads share
  one directory.

**Options (do not implement without a design and tests):**

1. **One deployment per school** (simplest near-term): each school gets its own
   API + database instance. Avoids a schema migration; higher operational cost.
2. **Tenant column + mandatory scoping**: add `schoolId` to every model, add a
   tenant claim to the JWT, and enforce the tenant filter in the shared CRUD
   layer so no route can forget it. Highest safety, largest change; must include
   migration + regression tests.

Either way, this must be a documented, reviewed migration with tests — not a
rushed change.

---

## 4. Findings

Severity: **High** = must fix before handling real school data / selling;
**Medium** = fix before production; **Low** = harden when practical.

| ID | Severity | Location | Summary |
| --- | --- | --- | --- |
| F-01 | High (commercial blocker) | whole schema / query layer | No multi-tenancy; single global data space. |
| F-02 | High | `users.routes.ts` (`studentsRouter`, `parentsRouter`) | Any authenticated role can list/read **all students and all parents** (including phone, address, birthday, bio, parent-child links); `GET /parents/:id` has no per-record scope. |
| F-03 | High | `academic.routes.ts` + `lib/authz.ts:21` | **Drivers can write** lessons, exams, assignments, and attendances: `writeRoles` includes `driver`, but each `writeScope` returns early for non-teachers. |
| F-04 | Medium-High | `records.routes.ts`, `academic.routes.ts` | **Drivers (and any future role) bypass read scopes**: scopes branch only on teacher/student/parent while some `readRoles` include driver or default to any-auth, so a driver can read all results/attendance/announcements/events/lessons/exams/assignments. |
| F-05 | Medium | `app.ts:98`, `analytics.routes.ts` | `GET /api/analytics` has **no role guard**; any authenticated user gets institution-wide counters. |
| F-06 | Medium | `users.router.ts:80-83` | Ban/unban response returns the target user's full document **including the bcrypt password hash** (`mapDoc` without `stripSecrets`). |
| F-07 | Medium | `app.ts:75-78` | `/uploads/**` served **without authentication** — anyone with a URL reads avatars and chat attachments. |
| F-08 | Medium | `upload.routes.ts` | Weak upload validation: image upload allows any `image/*` (incl. SVG); attachment upload blocks only 3 Windows MIME types; original file extension is preserved; files are served from the app origin → stored-content risks. |
| F-09 | Medium | `config/env.ts:12`, `.env.example:8` | JWT secret falls back to a well-known dev value; the committed example uses `change-me-in-production`. If deployed unset, tokens are forgeable. |
| F-10 | Medium | `app.ts:64-72`, `server.ts:14-19` | CORS reflects any origin when `CLIENT_ORIGINS` is empty, with credentials; Socket.IO sets `origin: true` unconditionally. |
| F-11 | Medium | `auth.routes.ts:67-118` | No rate limiting / lockout on sign-in; usernames are matched across all five models. |
| F-12 | Low-Medium | `error.middleware.ts` | Internal Prisma error messages can be returned to clients; full error objects are logged. |
| F-13 | Low-Medium | `transportation.routes.ts` (driver assignment routes) | A driver can create/update a `BusStudentAssignment` for an arbitrary `studentId` (only their own `busId` is enforced). |
| F-14 | Low-Medium | `sockets.ts:282-293` | Socket handshake verifies the JWT but does not re-check `isBanned`/`isActive` from the DB (unlike REST), so a banned/disabled user's unexpired token can still open a socket. |
| F-15 | Low | `records.routes.ts` (broadcast write scope) | Driver-authored announcements/events are stored with `createdByModel = "teacher"` (authorship mislabel). |
| F-16 | Low | `sockets.ts:297-317` | Every socket joins a broadcast room; `presence:list` exposes the full list of online user ids to all connected users. |
| F-17 | Low | `schema.prisma`, seed | Global uniqueness (`username`, `registrationNumber`) and global ticket sequences impede multi-tenant operation. |

### 4.1 Detail — the highest-priority items

**F-01 — No multi-tenancy.** See §3. Blocks selling one deployment to multiple
schools. *Recommendation:* choose option 1 or 2 in §3, document it, and test.

**F-02 — Student/parent PII exposed to any signed-in user.**
`studentsRouter`/`parentsRouter` use `peopleAuthz = { writeRoles: ADMIN_ROLES }`
with **no `readRoles`**, and `studentReadScope`/`parentReadScope` only act when
`role === "teacher"` (`users.routes.ts`). Therefore any authenticated student,
parent, or driver calling `GET /api/students` or `GET /api/parents` receives full
records (the response includes `parent`/`children`, phone numbers, addresses,
etc.; only `password` is stripped). `GET /api/parents/:id` has no
`readOneScope` at all. *Recommendation:* give these resources explicit
`readRoles` (staff-only) and add parent/student one-record scopes; scope the
directory listing separately.

**F-03 — Drivers can write academics.**
`STAFF_ROLES = ["admin","super-admin","teacher","driver"]` (`lib/authz.ts:21`)
is used as `writeRoles` for lessons/exams/assignments (`academic.routes.ts`) and
attendances (`records.routes.ts`), while each `writeScope` begins with
`if (req.user?.role !== "teacher") return;`. A driver therefore passes the role
gate and skips every class/ownership check, and can create/update/delete these
records for any class. *Recommendation:* drivers should not hold academic write
roles; restrict these to `["admin","super-admin","teacher"]` and make the scopes
fail-closed.

**F-04 — Read-scope gaps for non-teacher roles.**
`readScope` implementations branch only on `teacher`/`student`/`parent`. For
resources whose `readRoles` include `driver` (lessons/exams/assignments) or are
unset (results/attendances/announcements/events), a driver reads everything.
*Recommendation:* make scopes explicit for every allowed role and default to
deny.

**F-06 — Password hash in ban response.**
`users.router.ts:82` returns `{ ...mapDoc(updated), model }` where `updated` is
the full DB document; `mapDoc` does not remove `password`. *Recommendation:* use
`stripSecrets`/`locatedToPublic`.

**F-07/F-08 — Uploads.** Files are public and weakly validated. *Recommendation:*
serve uploads through an authenticated, authorized endpoint (or signed URLs);
validate content type by sniffing, not just the client-provided MIME; serve
untrusted content with `Content-Disposition: attachment` and a restrictive CSP;
disallow SVG or sanitize it.

---

## 5. Controls that are implemented (for balance)

- `requireAuth` re-derives role/status from the DB each request; token role
  tampering is not possible over REST (`auth.middleware.ts:50-61`).
- Chat is participant-scoped on every route; `typing` re-verifies participants
  and accepted status (`chat.routes.ts`, `sockets.ts:323-346`).
- Student/parent/teacher academic reads are scoped via server-derived class ids
  (`academic.routes.ts`, `records.routes.ts` — e.g. `pushScope({ studentId: uid })`,
  `scopeClassesForTeacher`).
- Fleet administration CRUD is gated to admins (`app.ts:120-136`); driver GPS/trip
  writes enforce bus ownership (`transportation.controller.ts`, `trips.ts`).
- Passwords are bcrypt-hashed and stripped from auth/user responses.

---

## 6. Prioritized remediation plan

1. **Tenancy (F-01/F-17)** — decide model; if multi-tenant, add `schoolId` +
   JWT claim + CRUD-layer enforcement before onboarding a second school.
2. **PII exposure (F-02)** — explicit `readRoles` + per-record scopes for
   students/parents; scope the directory.
3. **Driver over-privilege (F-03/F-04)** — remove `driver` from academic write
   roles; make all scopes fail-closed.
4. **Secrets/config (F-09/F-10)** — require a strong `JWT_SECRET`, set
   `CLIENT_ORIGINS`, disable the CORS-reflect fallback in production, restrict
   the socket CORS origin.
5. **Uploads (F-07/F-08)** — authenticated delivery + robust validation.
6. **Sign-in protection (F-11)** — rate limiting / lockout.
7. **Data hygiene (F-06/F-12)** — strip secrets everywhere; sanitize error
   responses; reduce logging of internal detail.
8. **Realtime (F-14/F-16)** — re-check account status on socket handshake; limit
   presence disclosure.
9. **Consistency (F-13/F-15)** — validate rider-assignment student ids; fix
   authorship labeling.

---

## 7. What this audit did not verify

- Runtime exploitability (no penetration testing performed).
- The built artifacts (`client/dist`, server bundle) for exactly what is
  redistributed or exposed.
- Infrastructure security (TLS, network, OS, database hardening, backups).
- Compliance with any specific privacy/security law.
- Third-party component security (dependency vulnerabilities) — run an SCA/audit
  tool (`pnpm audit`, Dependabot, etc.) and archive results.
