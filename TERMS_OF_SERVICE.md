# ConnectED — Terms of Service (Draft Template)

> **Status: DRAFT — NOT LEGAL ADVICE. Requires professional legal review.**
> This is a template, not a finalized agreement. It contains placeholders and
> explicitly-marked unresolved decisions. It must be reviewed by a qualified
> lawyer in the relevant jurisdiction and adapted to your actual business
> model, hosting arrangement, and the laws where your schools operate, before
> it is published or relied upon.
>
> **Draft for future commercial use only. The service is not currently offered,
> no agreement has been legally approved, and "IT Lens" is a planned brand name
> only — not a registered company.**

Effective date: `[EFFECTIVE DATE]` · Last updated: 2026-10-10 · Provider:
[CONTRACTING PARTY LEGAL NAME — TO BE FINALIZED] ("we", "us", "Provider"),
developing the service under the planned brand name **IT Lens** (a project/brand
name only — **not a registered company**).

---

## 1. Scope

These Terms govern the provision and use of ConnectED (the "Service"), a school
management software platform, by the subscribing school or education
organization ("Customer", "School") and its authorized users. Where a signed
commercial agreement exists between the Provider and the School, **that
agreement controls** in case of conflict, and these Terms supplement it.

## 2. Roles and responsibilities

### 2.1 Provider responsibilities
- Provide the Service as described in the applicable commercial agreement.
- Maintain the hosting environment, backups, and security controls at the
  level agreed `[SERVICE DESCRIPTION / SCHEDULE]`.
- Provide support and maintenance at the level agreed `[SUPPORT SCOPE]`.
- Handle security incidents affecting the Service per §10.

### 2.2 Customer responsibilities
- Obtain all consents and provide all notices required for the personal data
  (including children's data) it enters or processes through the Service.
- Administer its users, roles, and permissions appropriately.
- Keep credentials secure and promptly deactivate accounts that should no
  longer have access.
- Ensure its use complies with applicable education, child-protection,
  employment, and data-protection laws in its jurisdiction `[JURISDICTION]`.
- Not upload unlawful content or use the Service in ways prohibited in §3.

> **UNRESOLVED:** The allocation of data-protection responsibilities between
> Provider and School (controller/processor roles) must be confirmed in a Data
> Processing Agreement. See `PRIVACY_POLICY.md`.

## 3. Acceptable use

Users must not:
- access data they are not authorized to access, or attempt to bypass
  permissions;
- upload malware, or content that is unlawful, abusive, or infringing;
- use the Service to surveil, harass, or harm any person;
- interfere with the Service or other schools' use of it;
- use automated means to extract data beyond agreed exports.

## 4. Accounts and administration

- The School administers accounts for its administrators, teachers, students,
  parents/guardians, and transport staff.
- Account recovery and deactivation: `[PROCESS]`.
- The Provider may suspend accounts or deployments that present a security
  risk or breach these Terms, subject to `[NOTICE / CURE]`.

## 5. License and scope

Use of the Service is governed by the applicable commercial license (see
`COMMERCIAL_LICENSE.md` and any signed agreement). These Terms do not grant any
ownership of the software.

## 6. Subscription, fees, and payment

- Fees, billing period, and payment terms: `[CONFIGURABLE PLACEHOLDERS]`.
- Taxes: `[TERMS]`.
- Non-payment and suspension: `[TERMS]`.
- Refunds / cancellation: `[TERMS]`.

> **UNRESOLVED:** The actual pricing, billing mechanism, and payment terms are
> not yet defined. Do not publish this section until the business model is
> approved.

## 7. Hosting, availability, and maintenance

- Hosting model: `[Provider-hosted / School-hosted]`.
- Target availability / uptime: `[SLA PLACEHOLDER — e.g. X% monthly]`.
- Planned maintenance windows: `[TERMS]`.
- The Service may be unavailable during maintenance, incidents, or
  circumstances beyond the Provider's control.

> **UNRESOLVED:** No uptime target or SLA has been defined or verified.

## 8. Support and service levels

- Support channels and hours: `[SCOPE]`.
- Response/restoration targets: `[SLA PLACEHOLDERS]`.
- Exclusions: `[SCOPE]`.

> **UNRESOLVED:** Support scope and SLAs are not yet defined.

## 9. Data ownership and processing

- The School owns the School Data it enters.
- The Provider processes School Data only to provide and secure the Service and
  as instructed by the School (see `PRIVACY_POLICY.md`).
- Data location/region: `[REGION]`.
- Sub-processors: see `PRIVACY_POLICY.md` §"Third parties".

## 10. Security incident handling

- The Provider will investigate and respond to security incidents affecting
  the Service and will notify the School without undue delay where the
  incident affects School Data. `[DEFINE NOTIFICATION TIMELINE AND CHANNELS]`.
- The School will notify the Provider of suspected compromise of its accounts.

> **UNRESOLVED:** Incident-response process, notification timelines, and
> responsibilities are not yet documented operationally. See
> `docs/COMMERCIAL_DEPLOYMENT.md` §"Incident response".

## 11. Data export and termination

- On request or termination, the School may export its School Data in
  `[FORMAT]` within `[WINDOW]`.
- After the export window, data is deleted or returned per
  `PRIVACY_POLICY.md` §"Retention and deletion" and the applicable agreement.
- Backup retention after deletion: `[TERMS]`.

> **UNRESOLVED:** Export formats, deletion timelines, and backup handling on
> termination require confirmation (including whether deletion is technically
> achievable across all stores, given that uploaded files are kept on disk).

## 12. Backup and recovery

- Backup frequency and retention: `[TERMS]`.
- Recovery point / recovery time objectives: `[RPO / RTO]`.
- Responsibility for backups in Provider-hosted vs School-hosted mode:
  `[TERMS]`.

> **UNRESOLVED:** Backup and restore procedures are not yet defined or tested
> for production.

## 13. Intellectual property

The Provider (or its licensors) owns the Service and all related IP. The School
receives only the license in §5. Third-party components remain under their own
licenses (`THIRD_PARTY_NOTICES.md`).

## 14. Confidentiality

Each party will protect the other's confidential information and use it only to
perform under these Terms. `[TERM / EXCLUSIONS]`.

## 15. Warranties and disclaimers

THE SERVICE IS PROVIDED "AS IS" TO THE MAXIMUM EXTENT PERMITTED BY LAW. THE
PROVIDER DISCLAIMS ALL IMPLIED WARRANTIES. The Service is **not** represented as
free of defects or as production-ready; see
`docs/PRODUCTION_READINESS_CHECKLIST.md`.

## 16. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, `[LIABILITY CAP AND EXCLUSIONS]`.
`[Confirm enforceability and any mandatory carve-outs with counsel.]`

## 17. Indemnities

`[IP indemnity, data-protection indemnity, and mutual indemnities — TO BE
AGREED WITH COUNSEL.]`

## 18. Suspension and termination

- Termination for convenience: `[NOTICE]`.
- Termination for cause: `[TERMS]`.
- Effect of termination: access ends; §11 (export) and §9 (data) survive.

## 19. Dispute resolution and governing law

- Governing law: `[GOVERNING LAW]`.
- Dispute resolution/venue: `[COURTS / ARBITRATION]`.

## 20. Changes to these Terms

The Provider may update these Terms. Material changes will be notified with
`[NOTICE]`. Continued use constitutes acceptance where permitted by law.

## 21. Contact

IT Lens (planned brand) · [CONTACT EMAIL] · [OFFICIAL CONNECTED WEBSITE — NOT
YET AVAILABLE] · @kazue352.

---

### Explicitly unresolved business and legal decisions (review before publication)

1. Pricing, billing, taxes, refunds (§6).
2. Availability/SLA and maintenance expectations (§7).
3. Support scope and SLAs (§8).
4. Data-residency/region and sub-processor list (§9, Privacy Policy).
5. Incident-response timelines (§10).
6. Export format, deletion timeline, backup retention on termination (§11–12).
7. Liability cap, indemnities, and dispute resolution (§16–19).
8. Child-data consent model and applicable laws in each target jurisdiction
   (Myanmar and beyond).
