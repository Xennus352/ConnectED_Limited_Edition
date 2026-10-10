# ConnectED

### The Connected School Management Platform

**One platform. Every school operation. Clearer communication. Better visibility.**

ConnectED is a modern school management platform for private schools, bringing
academic workflows, administration, school communication, and student
transportation into one connected, role-based experience — for administrators,
teachers, students, parents, and drivers.

Instead of juggling disconnected tools, paper records, and scattered
conversations, a school's team can work from a shared platform, and each role
sees exactly the workspace built for it.

> **Built for the way modern schools work.** ConnectED helps a school organize
> information, coordinate people, and keep families informed from one place.

---

## Table of contents

- [What ConnectED solves](#what-connected-solves)
- [Who it is for](#who-it-is-for)
- [Verified features](#verified-features)
- [Feature status: implemented, partial, planned](#feature-status-implemented-partial-planned)
- [Screenshots](#screenshots)
- [Demo](#demo)
- [Technology](#technology)
- [Deployment overview](#deployment-overview)
- [Security & privacy](#security--privacy)
- [Installation & development](#installation--development)
- [Commercial licensing](#commercial-licensing)
- [Request a demonstration](#request-a-demonstration)
- [FAQ](#faq)
- [Project status & known limitations](#project-status--known-limitations)
- [Third-party notices](#third-party-notices)
- [Contact](#contact)

---

## What ConnectED solves

Private schools often run on a patchwork of spreadsheets, paper registers, chat
groups, and separate tools. That fragmentation costs time and creates blind
spots:

- **Scattered records.** Student, staff, and attendance information lives in
  different places, so nobody has a reliable, current picture.
- **Manual coordination.** Timetables, assignments, exams, and results are
  juggled by hand and re-entered.
- **Communication gaps.** Announcements, events, and parent questions get lost
  across channels.
- **Transport uncertainty.** Schools struggle to see routes, stops, riders, and
  vehicle activity in one place.

ConnectED aims to close those gaps with one connected platform.

## Who it is for

- **School owners & principals** — oversight of academics, staff, and
  operations from a single system.
- **Administrators** — day-to-day management of people, classes, subjects,
  rooms, communication, and transport.
- **Teachers** — a focused workspace for classes, attendance, assignments,
  exams, and results.
- **Parents** — visibility into their child's attendance, results,
  announcements, messages, and bus (where location data is available).
- **Students** — their timetable, assignments, exams, results, and school
  communication.
- **Drivers / transport staff** — assigned bus and route, rider management, and
  trip working.

---

## Verified features

> These categories reflect modules and screens that exist in the codebase. They
> are described honestly: see
> [Feature status](#feature-status-implemented-partial-planned) for what is
> complete vs. partial. Nothing below is a guarantee of accuracy, uptime, or
> compliance.

### Academic management
- Classes, rooms, and subjects management.
- Lessons and **timetables**.
- Assignments and **exams**.
- **Results** entry and viewing.

### Attendance & records
- Attendance tracking (including a teacher classroom attendance workflow).
- Student, teacher, parent, and driver records.

### Communication
- In-platform **messaging** with a request → accept conversation model.
- **Announcements** and **school events** (with a calendar view).
- In-app notifications and realtime updates.

### Portals & dashboards
- Role-based dashboards for **Super Admin, Admin, Teacher, Student, Parent, and
  Driver**.
- Parent portal (children overview) and student portal (personal timetable,
  assignments, results).
- Profile management.

### Transportation
- Fleet management: buses, routes, route stops, and student-to-bus assignments.
- **Rider management** for drivers.
- Trips, incidents, fuel, and maintenance records.
- A **live fleet map** (Leaflet + OpenStreetMap-compatible tiles) that displays
  reported vehicle positions with freshness states — see the honesty note in
  [known limitations](#project-status--known-limitations).

### Platform
- Responsive UI built with TailwindCSS and Radix-based (shadcn/ui) components.
- **Realtime** updates via Socket.IO (messaging, notifications, fleet, account
  events).
- **English and Burmese** interface translations.
- REST API with JWT authentication and role-based authorization.

---

## Feature status: implemented, partial, planned

Honest status as reviewed on 2026-10-10. "Implemented" means the module and UI
exist and are wired; it does not mean every path was exhaustively tested
(see `docs/PRODUCTION_READINESS_CHECKLIST.md`).

| Area | Status |
| --- | --- |
| Role-based dashboards & auth | Implemented |
| Classes, rooms, subjects, lessons, timetables | Implemented |
| Attendance, assignments, exams, results | Implemented |
| Announcements, events, messaging, notifications | Implemented |
| Parent & student portals | Implemented |
| Transport: buses, routes, stops, assignments, rider mgmt, trips | Implemented |
| Live bus map | Partially implemented — depends on real location data; a **demo simulator** fakes movement in development |
| Multi-school (multi-tenant) isolation | **Not implemented** — one deployment per school today (see below) |
| Billing / payments / license enforcement | Not implemented (see `docs/LICENSE_ENFORCEMENT_PROPOSAL.md`) |
| Automated test suite | Not present |
| Production hardening (uploads, rate limiting, monitoring, backups) | Partial / planned — see `docs/PRODUCTION_READINESS_CHECKLIST.md` |

---

## Screenshots

**No product screenshots are included in this repository yet.** To keep this
honest, we are not adding fabricated or stock images. Real screenshots should be
captured from the running product (using sample data, never real student data)
and placed in `docs/screenshots/`.

Recommended set (see `docs/SALES_PREPARATION.md` for the full checklist):

- Administrator dashboard
- Teacher workspace (class, attendance, assignments)
- Student portal
- Parent portal
- Messaging
- Attendance & academic workflows
- Rider management
- Live bus map (only with genuine live location data)

---

## Demo

There is **no hosted public demo**. A **local demonstration** can be run from
this repository in a few minutes using the bundled seed data.

### Run the local demo

Prerequisites: Node.js (current LTS), pnpm, and Docker (for MongoDB).

```bash
pnpm install
pnpm db:up        # start MongoDB (Docker, replica set)
pnpm db:setup     # prisma generate + db push + seed demo data
pnpm dev          # client on :5173, API on :8000
```

Then open `http://localhost:5173` and sign in with a **demo** account:

> ⚠️ **These are demo-only credentials from `server/prisma/seed.ts`. They are not
> production secrets, but you must rotate/remove them before any real use.**

| Role | Username | Password |
| --- | --- | --- |
| Super admin | `superadmin` | `SuperAdmin@123` |
| Admin | `admin` (also `admin2`) | `Admin@123` |
| Teacher | `teacher` (also `teacher1`…`teacher5`) | `Teacher@123` |
| Student | `student` (also `student1`…`student11`) | `Student@123` |
| Parent | `parent` (also `parent1`…`parent5`) | `Parent@123` |
| Driver | `driver` (also `driver1`…`driver3`) | `Driver@123` |

The seed also creates sample classes, subjects, lessons, exams, assignments,
announcements, events, and a small fleet with routes and stops so the dashboards
and map have data.

---

## Technology

ConnectED is a pnpm monorepo with two workspaces.

**Client (`client/`)**
- React 18 + TypeScript, built with **Vite**
- Redux Toolkit + TanStack React Query + React Router
- TailwindCSS with Radix-based (shadcn/ui) components
- i18next (English / Burmese), Socket.IO client, Leaflet maps, Recharts, GSAP

**Server (`server/`)**
- Node.js + Express 4 + TypeScript
- **Prisma** ORM with **MongoDB**
- JWT authentication, bcrypt password hashing
- Socket.IO for realtime
- multer for uploads, morgan for HTTP logging

> Note: there is **no Next.js** in this product. The runtime stack is
> React + Vite + Express + Prisma + MongoDB.

---

## Deployment overview

ConnectED can be deployed **vendor-hosted** (recommended for smaller schools) or
**school-hosted**. At a high level:

1. Provision MongoDB 7 (a replica set is required for Prisma transactions).
2. Configure environment variables for the API (see `server/.env.example`) and
   the client (see `client/.env.example`).
3. Build both workspaces (`pnpm build`) and run the API
   (`node server/dist/server.js`).
4. Serve the built client (`client/dist`) as a static SPA (all paths fall back to
   `index.html`).
5. Terminate HTTPS and proxy WebSockets to the API port.
6. Configure a strong `JWT_SECRET` and an explicit `CLIENT_ORIGINS` allow-list,
   and disable the demo fleet simulator in production.

**Full procedure, environment variables, backups, and the gaps to close first
are in [`docs/COMMERCIAL_DEPLOYMENT.md`](docs/COMMERCIAL_DEPLOYMENT.md).**

---

## Security & privacy

ConnectED handles sensitive school information (students, families, staff, and
transport). The current implementation already provides:

- JWT-based authentication with server-side account-status re-checks.
- bcrypt password hashing; passwords are stripped from responses.
- Role-based authorization with teacher/parent/student scoping.
- Participant-scoped messaging.
- Admin-gated fleet administration.

**Important honesty note:** the platform is **not yet production-hardened**, and
it is **currently single-tenant** (no school/organization isolation). A read-only
security and multi-tenancy audit is included and must be addressed before selling
to multiple schools:

- [`docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`](docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md)
- [`docs/PRODUCTION_READINESS_CHECKLIST.md`](docs/PRODUCTION_READINESS_CHECKLIST.md)

Do not claim compliance with any privacy law or security standard — such claims
require independent verification.

---

## Installation & development

### Prerequisites
- Node.js (current LTS; the repo does not pin a version)
- pnpm
- Docker (for the local MongoDB)

### Setup

```bash
# 1. Install dependencies (workspace root)
pnpm install

# 2. Start MongoDB (Docker, single-node replica set)
pnpm db:up

# 3. Create the schema and seed demo data
pnpm db:setup

# 4. Run client + server together
pnpm dev
```

- Client: `http://localhost:5173`
- API: `http://localhost:8000` (`GET /api/health`)

### Root scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Run client and server in parallel |
| `pnpm dev:client` / `pnpm dev:server` | Run one workspace |
| `pnpm build` | Build all workspaces |
| `pnpm db:up` / `pnpm db:down` | Start/stop MongoDB |
| `pnpm db:setup` | Generate Prisma client, push schema, seed (destructive) |
| `pnpm db:reset` | Force-reset the schema and reseed |
| `pnpm db:studio` | Open Prisma Studio |

### Configuration

- **Server:** copy `server/.env.example` to `server/.env` and set values.
- **Client:** copy `client/.env.example` to `client/.env` and set
  `VITE_API_BASE_URL`.

See [`docs/COMMERCIAL_DEPLOYMENT.md`](docs/COMMERCIAL_DEPLOYMENT.md) §2 for the
full variable list.

### Useful checks

```bash
pnpm --filter ./server typecheck   # tsc --noEmit
pnpm --filter ./client lint        # eslint
pnpm build                         # type-check + build both workspaces
```

---

## Commercial licensing

ConnectED is **proprietary software**. It is not open source, and no public
license is granted by this repository. Use is permitted only under a separately
signed commercial agreement.

- [`LICENSE`](LICENSE) — proprietary license notice (draft).
- [`COMMERCIAL_LICENSE.md`](COMMERCIAL_LICENSE.md) — commercial license template
  and proposed offerings (single-school, multi-campus, enterprise, hosted,
  school-hosted, installation, migration, training, support, custom
  development — **proposed, no prices set**).

> These documents are **drafts requiring legal review**. They are not legal
> advice and are not lawyer-approved.

---

## Request a demonstration

A school can request:

- a **product demonstration**,
- a **school-specific needs assessment**,
- **installation and deployment**,
- **customization** and **integrations**,
- **training and onboarding**, and
- **ongoing support and maintenance**.

Contact: **@kazue352** — **xennus.dev@gmail.com** ·
Website: **https://soemoekyaw-portfolio.netlify.app/** · Product name: **IT Lens** ·
Demo: **not available yet** (a local demo can be run from this repository).

See [`docs/SALES_PREPARATION.md`](docs/SALES_PREPARATION.md) for the internal
sales process and screenshot checklist.

---

## FAQ

**Is ConnectED open source?**
No. It is proprietary software, licensed commercially.

**Can one deployment serve multiple schools?**
Not today. The platform is single-tenant; each school should run its own
deployment until multi-tenancy is implemented and tested. See the audit.

**Does it guarantee GPS accuracy or bus arrival times?**
No. The map shows reported positions and their freshness. Accuracy depends on the
device and network. We do not guarantee accuracy or ETAs.

**Does it support Burmese?**
The interface includes English and Burmese translations; coverage is confirmed
per screen during assessment.

**Is it production-ready?**
It is a working platform, but it needs the items in the production readiness
checklist completed and verified before handling real school data.

**Where can it be hosted?**
Vendor-hosted or school-hosted; see the deployment guide.

**How is data protected?**
See [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) and the security audit. The privacy
policy is a draft requiring legal and operational review.

---

## Project status & known limitations

ConnectED is an actively developed platform. Honest current limitations:

- **Single-tenant:** no school/organization isolation yet — one deployment per
  school.
- **Not production-hardened:** uploaded files are currently public; there is no
  rate limiting, monitoring, or backup tooling in the repo; the demo GPS
  simulator must be disabled in production.
- **No automated tests.**
- **Schema uses `db push`, not versioned migrations.**
- **Third-party/licensing items to resolve** before commercial distribution
  (notably a third-party logo asset and non-permissive frontend dependencies) —
  see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- **Legal templates are drafts** and require professional review.

**Before onboarding a paying school, complete
[`docs/PRODUCTION_READINESS_CHECKLIST.md`](docs/PRODUCTION_READINESS_CHECKLIST.md).**

---

## Third-party notices

ConnectED includes open-source and other third-party components under their own
licenses, plus some assets whose rights must be verified before commercial
distribution. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the
preliminary audit and the items needing review.

---

## Contact

- **Business / licensing:** IT Lens — xennus.dev@gmail.com
- **Website:** https://soemoekyaw-portfolio.netlify.app/
- **Commercial contact:** @kazue352
- **Demo:** Not available yet — run the local demo from this repository.

*(Business details supplied by IT Lens. The legal templates elsewhere in this
repository remain drafts requiring professional legal review.)*
