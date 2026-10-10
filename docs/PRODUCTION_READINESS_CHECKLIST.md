# ConnectED — Production Readiness & Commercial Onboarding Checklist

> **Purpose:** the go/no-go checklist and gap register for deploying ConnectED to
> a paying school. Nothing here should be marked "done" without evidence.
> Cross-references: `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`,
> `docs/COMMERCIAL_DEPLOYMENT.md`, `THIRD_PARTY_NOTICES.md`.
>
> Status labels use the brief's taxonomy: **Implemented / Partially implemented
> / Planned / Unverified**.

Last reviewed: 2026-10-10.

---

## 0. Verification commands (run and record the result)

These are the actual commands the repository supports. **There is currently no
automated test suite** (no `test` script in the root, `client`, or `server`
`package.json`), which is itself a readiness gap.

```bash
# Install (pnpm workspace)
pnpm install

# Type-check
pnpm --filter ./server typecheck     # tsc --noEmit
pnpm --filter ./client build         # tsc -b + vite build (also type-checks)

# Lint
pnpm --filter ./client lint          # eslint .

# Build both workspaces
pnpm build                           # pnpm -r build
```

```bash
# Runtime smoke test (development)
pnpm db:up && pnpm db:setup
pnpm dev                             # client :5173, server :8000
curl -s http://localhost:8000/api/health
```

Record: command, date, result. Do not mark production-ready items as verified
without a run.

---

## 1. Multi-tenancy & data isolation — **BLOCKER for multi-school sales**

| Item | Status | Notes |
| --- | --- | --- |
| Each school has a tenant/organization identity | **Planned (missing)** | No `school`/`tenant` model or field exists anywhere. |
| A user belongs to exactly one school/tenant | **Planned (missing)** | JWT has no tenant claim. |
| Backend derives tenant from authenticated context | **Planned (missing)** | No tenant filter in the query/CRUD layer. |
| Queries are tenant-scoped | **Planned (missing)** | — |
| No cross-school access by id manipulation | **Unverified / at risk** | Single data space; see audit F-01. |
| Per-school admin boundaries | **Planned (missing)** | `admin`/`super-admin` are global. |

**Decision required:** one deployment per school (near-term) **or** add `schoolId`
+ JWT claim + CRUD-layer enforcement (with migration + regression tests). Do not
attempt the migration without a design and tests.

---

## 2. Authentication & authorization

| Item | Status | Notes |
| --- | --- | --- |
| JWT authentication, server-side status re-check on REST | **Implemented** | `requireAuth` reloads role/status per request. |
| Passwords hashed (bcrypt), stripped from responses | **Implemented** | Except the ban/unban response (audit F-06). |
| Role-based access control in shared CRUD layer | **Implemented (with gaps)** | See F-02/F-03/F-04. |
| Student scoped to own records | **Implemented** | e.g. `pushScope({ studentId })`. |
| Parent scoped to own children | **Implemented** | Parent scopes by children. |
| Teacher scoped to own classes | **Implemented** | `teacherClassIds` scoping. |
| Directory/student/parent lists restricted to staff | **Partially implemented** | Any authenticated role can list students/parents (F-02). |
| Drivers limited to transport duties | **Partially implemented** | Drivers have academic write (F-03) and broad reads (F-04). |
| Socket handshake re-checks banned/disabled | **Planned (missing)** | F-14. |
| Rate limiting / lockout on sign-in | **Planned (missing)** | F-11. |
| Password policy / reset flow | **Unverified** | Confirm whether a reset flow exists. |

---

## 3. Data protection & privacy

| Item | Status | Notes |
| --- | --- | --- |
| Personal data inventory documented | **Implemented (draft)** | `PRIVACY_POLICY.md`. |
| Controller/processor roles defined + DPA | **Planned** | To be agreed; not in code. |
| Retention & deletion policy | **Planned (missing)** | Not defined in code; deletion of uploads/backups untested. |
| Data export procedure | **Planned** | No dedicated export endpoint documented. |
| Uploaded files access-controlled | **Planned (missing)** | Public `/uploads` (F-07). |
| GDPR/child-data/education-law compliance | **Unverified** | Requires local counsel. |
| Third-party data flows reviewed (fonts, tiles) | **Partially documented** | See `PRIVACY_POLICY.md` §9. |

---

## 4. Application security

| Item | Status | Notes |
| --- | --- | --- |
| JWT secret is strong and unique | **Required (config)** | Example value must not be used (F-09). |
| CORS allow-list configured | **Required (config)** | Empty reflects any origin (F-10). |
| Upload content validated/sniffed | **Partially implemented** | Weak validation (F-08). |
| Uploaded content served safely | **Planned (missing)** | F-07/F-08. |
| Stored-content/XSS/SVG risk addressed | **Planned** | — |
| Error responses do not leak internals | **Partially implemented** | F-12. |
| Dependency vulnerability scan | **Planned** | No SCA configured; run `pnpm audit`/Dependabot. |
| Secrets excluded from source control | **Implemented** | `.env` gitignored; verified untracked. |
| Transport encryption (HTTPS) | **Required (infra)** | Not enabled by default. |

---

## 5. Infrastructure & operations

| Item | Status | Notes |
| --- | --- | --- |
| Database backups + tested restore | **Planned (missing)** | No backup script; see deployment guide §10. |
| Monitoring / alerting | **Planned (missing)** | None configured. |
| Health check | **Implemented** | `GET /api/health`. |
| Centralized logs | **Planned** | Morgan only. |
| Multi-instance / Socket.IO adapter | **Planned** | In-memory adapter = single instance. |
| Uploads on persistent storage + backed up | **Planned** | — |
| Demo simulator disabled in production | **Required (config)** | `FLEET_SIMULATION_ENABLED=false`. |
| Map provider suitable for commercial volume | **Required (business)** | OSM community tiles not for heavy commercial use. |

---

## 6. Deployment & release

| Item | Status | Notes |
| --- | --- | --- |
| Reproducible builds (`pnpm build`) | **Implemented** | Client + server build. |
| Versioned DB migrations | **Planned (missing)** | Uses `prisma db push`, not `migrate`. |
| Non-destructive production seed/bootstrap | **Planned (missing)** | Demo seed is destructive. |
| Documented deployment procedure | **Implemented (draft)** | `docs/COMMERCIAL_DEPLOYMENT.md`. |
| Rollback procedure | **Planned** | Described, not automated/tested. |
| Staging environment | **Planned** | — |

---

## 7. Product completeness (as observed in the codebase)

This is a coarse map of what exists. "Implemented" means the screens/routes are
present and wired; it does **not** mean every path was tested. "Unverified"
means it could not be confirmed in a read-only review.

| Area | Status | Evidence / notes |
| --- | --- | --- |
| Role-based dashboards (Admin, Teacher, Student, Parent, Driver) | **Implemented** | Client dashboards per role. |
| Authentication (sign-in, session, ban) | **Implemented** | REST + JWT + ban handling. |
| Classes, rooms, subjects | **Implemented** | CRUD modules. |
| Lessons / timetables | **Implemented** | Lessons CRUD + timetable views. |
| Attendance | **Implemented** | Records module + classroom UI. |
| Assignments | **Implemented** | Assignments CRUD + student views. |
| Exams | **Implemented** | Exams CRUD. |
| Results | **Implemented** | Results module + UI. |
| Announcements | **Implemented** | Records module. |
| School events + calendar | **Implemented** | Events module + calendar UI. |
| Messaging / chat (request→accept) | **Implemented** | Chat REST + Socket.IO. |
| Notifications (in-app) | **Implemented** | Notification UI + socket events. |
| Parent portal | **Implemented** | Parent dashboard + children. |
| Student portal | **Implemented** | Student dashboard + own records. |
| Transportation: buses, routes, stops | **Implemented** | Transportation module. |
| Rider management | **Implemented** | Driver rider-management screens. |
| Live bus map | **Partially implemented / Unverified** | Works only with real location data; demo simulator fakes movement. |
| GPS accuracy / ETA guarantees | **Not provided** | Do not claim. |
| Multi-tenancy | **Not implemented** | See §1. |
| Billing / payments / license enforcement | **Not implemented** | See `docs/LICENSE_ENFORCEMENT_PROPOSAL.md`. |
| Offline/PWA | **Unverified** | README mentions PWA; confirm service worker. |
| Automated tests | **Not present** | No test suite. |

---

## 8. Legal & commercial

| Item | Status | Notes |
| --- | --- | --- |
| Proprietary LICENSE present | **Implemented (draft)** | `LICENSE`. |
| Commercial license template | **Implemented (draft)** | `COMMERCIAL_LICENSE.md`. |
| Terms of Service template | **Implemented (draft)** | `TERMS_OF_SERVICE.md`. |
| Privacy Policy template | **Implemented (draft)** | `PRIVACY_POLICY.md`. |
| Third-party notices | **Implemented (draft/audit)** | `THIRD_PARTY_NOTICES.md`. |
| Ownership/contributor rights confirmed | **Planned (action required)** | Must be confirmed in writing. |
| Logo/brand assets cleared for commercial use | **Action required** | Third-party "All Rights Reserved" logo (see notices). |
| Non-permissive dependency (react-leaflet Hippocratic-2.1, GSAP) resolved | **Action required** | Legal review or replacement. |
| Business details filled in (name, email, site, demo, contact) | **Action required** | Placeholders remain. |
| Lawyer review of all legal templates | **Action required** | None of these are lawyer-approved. |

---

## 9. Prioritized next steps before onboarding the first paying school

**Must do (blockers):**
1. Decide and document the deployment/tenancy model; if multi-tenant, design and
   test it. Until then, **one deployment per school**.
2. Fix PII exposure: explicit `readRoles` + per-record scopes for students and
   parents (audit F-02).
3. Remove `driver` from academic write roles; make all scopes fail-closed
   (F-03/F-04).
4. Serve uploads through authenticated/authorized delivery; strengthen upload
   validation (F-07/F-08).
5. Set a strong `JWT_SECRET` and an explicit `CLIENT_ORIGINS`; disable CORS
   reflection and the fleet simulator in production (F-09/F-10).
6. Resolve third-party licensing: react-leaflet (Hippocratic-2.1), GSAP standard
   license, and **replace the third-party logo** (`THIRD_PARTY_NOTICES.md`).
7. Obtain legal review of `LICENSE`, `COMMERCIAL_LICENSE.md`,
   `TERMS_OF_SERVICE.md`, and `PRIVACY_POLICY.md`; confirm ownership/contributor
   rights.
8. Stand up backups + a **tested** restore, monitoring, and HTTPS.

**Should do (before scale):**
9. Add versioned DB migrations and a non-destructive production bootstrap.
10. Add sign-in rate limiting; sanitize error responses; strip the password hash
    from the ban response (F-06/F-11/F-12).
11. Add an automated test suite and a dependency vulnerability scan in CI.
12. Re-check account status on socket handshake (F-14).
13. Multi-instance readiness (Socket.IO adapter + sticky sessions).
14. Fill in all business placeholders and capture the screenshots listed in
    `docs/SALES_PREPARATION.md`.

**Nice to do:**
15. License-enforcement design (see `docs/LICENSE_ENFORCEMENT_PROPOSAL.md`) —
    only if the business requires it.
16. Self-host fonts; choose a commercial map tile provider.
