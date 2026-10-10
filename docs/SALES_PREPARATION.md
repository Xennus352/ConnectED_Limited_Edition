# ConnectED — Sales Preparation & Enablement

> **For internal commercial use.** This is the sales companion to the product
> `README.md`. It contains **placeholders** — fill them in before sharing
> anything externally. **Never invent** testimonials, school counts, statistics,
> certifications, awards, integrations, URLs, or contact details.
>
> **IT Lens is a planned brand/project name only — not a registered company.**
> ConnectED is **not yet commercially available**; the contact, website, and demo
> details below are not yet established. See
> [`PLACEHOLDERS.md`](PLACEHOLDERS.md) for the full list.

Last updated: 2026-10-10.

---

## 1. Business details & placeholders

| Detail | Current value | Replace when |
| --- | --- | --- |
| Product name | ConnectED | — |
| Planned brand | **IT Lens** — project/brand name only, **not a registered company** | You decide whether to formalize a brand/company |
| Contracting party (legal name) | `[CONTRACTING PARTY LEGAL NAME — TO BE FINALIZED]` | You register a business or choose the contracting entity |
| Contact email | `[CONTACT EMAIL]` | You establish an official contact |
| Official website | `[OFFICIAL CONNECTED WEBSITE — NOT YET AVAILABLE]` | You obtain a dedicated domain |
| Interim contact | @kazue352 (Telegram) | You establish official contact details |
| Registered address | `[REGISTERED ADDRESS — TO BE FINALIZED]` | You have a registered address |
| Phone (optional) | `[CONTACT PHONE — OPTIONAL]` | Optional |
| Demo URL | **None yet** — local demo only | A safe, hosted demo exists (no real student data) |

> Do **not** publish a contact email, website, or demo URL until they are real
> and official. Do **not** describe IT Lens as a registered company until it is
> one.

---

## 2. How a school engages (process)

1. **Product demonstration** — a guided walkthrough of the relevant role
   dashboards and workflows for the school's needs.
2. **Needs assessment** — gather class/student/staff counts, existing tools,
   transport usage, language needs (English/Burmese), and hosting preference.
3. **Proposal & licensing** — scope the license (schools, campuses, seats, term)
   using `COMMERCIAL_LICENSE.md`.
4. **Installation & deployment** — per `docs/COMMERCIAL_DEPLOYMENT.md`
   (vendor-hosted or school-hosted).
5. **Onboarding & training** — administrators, teachers, parents, drivers.
6. **Ongoing support** — per the agreed support scope.

### Contact template

> **Interested in ConnectED for your school? Contact us to request a
> demonstration or early access.**
>
> Email: **[CONTACT EMAIL]** · Interim: @kazue352 (Telegram) · Official website:
> [OFFICIAL CONNECTED WEBSITE — NOT YET AVAILABLE].

---

## 3. What to show, by audience (verified features only)

Only demonstrate features that genuinely work in the environment you are
showing. See the status matrix in `docs/PRODUCTION_READINESS_CHECKLIST.md` §7.

| Audience | Lead with |
| --- | --- |
| School owner / principal | Role dashboards, attendance & results visibility, transport oversight, one-platform consolidation |
| Administrator | Classes/subjects/rooms, user management, announcements/events, fleet management |
| Teacher | Class workspace, attendance, assignments, exams, timetable, results entry |
| Parent | Child's attendance/results, announcements/events, messaging, bus view (if live data exists) |
| Student | Personal timetable, assignments, exams/results, announcements, messaging |
| Driver | Assigned bus/route, rider management, location reporting, trips |

---

## 4. Screenshot capture checklist

Capture these from the **actual running product** using a demo/sample dataset
(never real student data). Suggested naming: `docs/screenshots/<role>-<screen>.png`.

- [ ] **Administrator dashboard** — counters and charts.
- [ ] **Teacher workspace** — class, attendance, assignments.
- [ ] **Student portal** — dashboard, timetable, results.
- [ ] **Parent portal** — child overview, announcements.
- [ ] **Messaging** — conversation list and a chat thread.
- [ ] **Attendance workflow** — taking/marking attendance.
- [ ] **Academic workflow** — assignment or exam creation / results.
- [ ] **Announcements & events** — list and calendar.
- [ ] **Rider management** — driver's rider list.
- [ ] **Live bus map** — **only if it genuinely displays live location data**
      (do not screenshot the demo simulator and present it as live tracking).

> The repository currently contains **no product screenshots**. Add real ones;
> do not fabricate images.

---

## 5. Honest claims guardrails

**Say:**
- "ConnectED brings academic, administrative, communication, and transport
  workflows into one role-based platform."
- "Role-based dashboards for administrators, teachers, students, parents, and
  drivers."
- "Built with modern, widely-used web technologies."

**Do not say (unverified or unsupported):**
- Specific performance, uptime, security, or accuracy guarantees.
- "Production-ready", "enterprise-grade", "compliant with GDPR/ISO/…".
- Customer counts, testimonials, awards, or partnerships that do not exist.
- "Real-time GPS tracking with guaranteed accuracy/ETAs".
- Any integration you have not actually built.

---

## 6. Objection handling (accurate answers)

| Objection | Accurate response |
| --- | --- |
| "Is our data isolated from other schools?" | "Each school runs in its own deployment today. We are designing shared multi-tenancy as a separate, tested project." |
| "Is it production-ready?" | "It is a working platform; we have a published readiness checklist we complete with each deployment before go-live." |
| "How accurate is the live map?" | "Location accuracy depends on the device and network. We show reported positions and their freshness; we don't guarantee accuracy or ETAs." |
| "Do you support Burmese?" | "The interface has English and Burmese translations; we confirm coverage of the screens you need during the assessment." |
| "Where is data hosted?" | "Your choice: vendor-hosted or school-hosted. We document the deployment in the deployment guide." |

---

## 7. Legal documents to attach to a deal

- `COMMERCIAL_LICENSE.md` — license scope and terms (requires legal review).
- `TERMS_OF_SERVICE.md` — service terms (requires legal review).
- `PRIVACY_POLICY.md` — privacy terms (requires legal review + a DPA).
- `THIRD_PARTY_NOTICES.md` — disclosed third-party components.

> Do not represent any of these as lawyer-approved until they are.
