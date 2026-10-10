# ConnectED — Privacy Policy (Draft Template)

> **Status: DRAFT — NOT LEGAL ADVICE. Requires legal AND operational review.**
> This template is based on an inspection of the ConnectED codebase dated
> 2026-10-10. It describes data the **software is capable of processing**; it does
> not assert that any particular deployment actually processes it, nor that the
> described protections are fully implemented. Every claim here must be verified
> against the specific deployment and reviewed by qualified counsel before
> publication. Do not publish this policy as-is.

Effective date: `[EFFECTIVE DATE]` · Controller/Provider: IT Lens ·
Contact: xennus.dev@gmail.com.

---

## 1. About this policy

ConnectED is school management software that processes information about
students, parents/guardians, teachers, other school staff, and school transport
operations. This policy explains, at a template level, what the platform can
process, why, who can access it, and how it should be governed. **The School
using ConnectED is generally the data controller; the Provider generally acts as
a data processor** — `[CONFIRM AND DOCUMENT IN A DPA]`.

## 2. Categories of personal data

Based on the current data model, the platform may store the following. Some
categories apply only if the school uses the corresponding module.

**Identity and account data (all user roles):**
- Full name, username, email, phone number, address, gender, date of birth,
  short biography, and profile photo. ([`server/prisma/schema.prisma`](server/prisma/schema.prisma) — `Admin`, `Teacher`, `Student`, `Parent`, `Driver` models)
- Account status and ban flags.
- Password (stored only as a bcrypt hash; never in plaintext).

**Student data:**
- Class enrollment, attendance records (present/late/late-minutes), exam and
  assignment results and scores, bus assignments.
- Linkage to a parent/guardian account.

**Parent/guardian data:**
- Account data plus links to their children's student records.

**Teacher/staff data:**
- Assigned classes, subjects, and lessons; primary class.

**Transport data:**
- Driver/bus assignment, trips, boarding events (which may include GPS
  coordinates), incidents, fuel records, and driver shifts.
- Vehicle location history (`BusLocation`) including latitude, longitude,
  speed, heading, accuracy, and timestamps.
- Route and stop definitions.

**Communications:**
- Conversations and messages between users, including message text, read
  timestamps, and uploaded file attachments (name, type, size, URL).

**Academic communications:**
- Announcements and events, including author references.

> **UNVERIFIED:** The exact fields exposed to each role, retention periods, and
> whether any deployment adds further fields must be confirmed per deployment.

## 3. Purposes of processing

- **School operations:** managing users, classes, subjects, timetables, and
  records.
- **Academic administration:** attendance, assignments, exams, results.
- **Communication:** announcements and in-platform messaging.
- **Transportation:** route, bus, rider management and location visibility.
- **Security and support:** authentication, account status, incident handling.

Child data and transport location data require special care and a lawful basis
appropriate to the jurisdiction; the School is responsible for obtaining
consents and giving notices.

## 4. Controller vs. processor responsibilities

- **School (controller):** determines why and how student/family/staff data is
  processed; obtains consents; responds to data-subject/guardian requests;
  complies with applicable education and child-protection law.
- **Provider (processor):** processes data on the School's behalf to provide and
  secure the Service; does not use School Data for its own purposes;
  implements specified technical and organizational measures.

`[ATTACH A DATA PROCESSING AGREEMENT. Confirm role terminology for each
jurisdiction,]`

## 5. Data storage and retention

- Primary datastore: MongoDB (see `docs/COMMERCIAL_DEPLOYMENT.md`).
- Uploaded files: stored on the server filesystem under `/uploads` and served
  as static files. **Access-control caveat:** as currently implemented, uploaded
  files are served without authentication, and upload validation is limited —
  this must be fixed and documented (see `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`,
  findings F-08/F-09).
- Retention periods are **not defined in code** and must be set by policy:
  `[RETENTION SCHEDULE]`.
- Location history is stored continuously while buses report; a retention and
  minimization policy is required `[RETENTION FOR LOCATION DATA]`.

## 6. Authorized access

Access is intended to be role-scoped server-side. The current implementation
scopes student, parent, and teacher access to their own records/classes, but the
security audit identified cases where some roles can read or write data beyond
their intended scope (for example, drivers have broad academic access, and
students/parents can enumerate directories). **Do not describe a deployment as
properly access-controlled until those findings are remediated and verified.**
See `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`.

## 7. File uploads and communication records

- Users can upload images and chat attachments.
- Messages and attachments are stored and may be retained subject to policy.
- The platform has no end-to-end encryption for messages; data is protected by
  transport (HTTPS, once configured) and access controls.

## 8. GPS and transportation data

- If the transport module is used, the platform can store and display vehicle
  locations, including historical routes and boarding events with coordinates.
- Location data is only meaningful when a genuine device/telemetry feed is
  configured. The product must not be represented as guaranteeing GPS accuracy
  or arrival times.
- Location viewing is intended to be limited to authorized roles (drivers,
  parents of riders, school administrators). See the audit for current
  limitations.

## 9. Third parties and sub-processors

The deployment can involve third parties that may receive data (for example,
IP addresses and request metadata):

- **Google Fonts** — the client loads Poppins and Noto Sans Myanmar from Google
  Fonts over the network. `[Review whether to self-host fonts to avoid this
  third-party call and the associated privacy implications.]`
- **OpenStreetMap / map tile providers** — map views request raster tiles from
  a configured tile server (default `tile.openstreetmap.org`), which can receive
  the user's IP and viewed coordinates. `[Review tile provider terms and
  privacy policy.]`
- **Hosting/email/storage providers** — `[LIST ACTUAL PROVIDERS]`.

> **UNVERIFIED:** No other sub-processors are defined. Confirm and list all
> actual providers in the deployment before publication.

## 10. Data exports and deletion

- Schools can request exports of School Data; format and process: `[DEFINE]`.
- Deletion of data (including backups and uploaded files) must be technically
  achievable and documented. `[DEFINE AND TEST DELETION PROCEDURE.]`

## 11. Security controls

Implemented at the code level (to be verified per deployment):
- Password hashing with bcrypt.
- JWT-based authentication; server-side re-check of account status on each REST
  request.
- Role-based authorization in a shared CRUD layer.
- Transport encryption **only when HTTPS is configured** (not enabled by
  default in the development setup).

**Not yet provided / must be addressed before handling real data:** per-deployment
tenant isolation (the platform is currently single-tenant), upload access
control, rate limiting, and formal monitoring. See the audit and
`docs/PRODUCTION_READINESS_CHECKLIST.md`.

## 12. Requests from data subjects or guardians

Requests (access, correction, deletion, objection) should be directed to the
School as controller, and forwarded to `xennus.dev@gmail.com` as needed. Process
and response timelines: `[DEFINE]`.

## 13. Legal bases and applicable law

Applicable law depends on where the School and its users are located. For schools
in Myanmar, `[IDENTIFY APPLICABLE MYANMAR LAWS]`; for other jurisdictions,
`[IDENTIFY]`. Child data and education records may attract additional
requirements. **A qualified lawyer must determine the applicable legal bases,
notices, and consents.**

## 14. Changes and contact

Material changes will be notified per `[PROCESS]`. Questions:
xennus.dev@gmail.com / https://soemoekyaw-portfolio.netlify.app/.

---

### Minimum actions before publishing this policy

1. Confirm controller/processor roles and sign a DPA with each school.
2. Define retention, export, and deletion schedules — and verify deletion works.
3. Fix upload access control and validation (audit F-08/F-09).
4. Decide whether to self-host fonts and choose a map provider under suitable
   terms (audit §9 above).
5. Remediate the authorization findings in
   `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md`.
6. Have counsel confirm legal bases, child-data consents, and cross-border
   transfer positions for each target market.
