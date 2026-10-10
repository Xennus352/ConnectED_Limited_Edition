# ConnectED — Commercial License Template

> **Status: DRAFT TEMPLATE for internal review — NOT LEGAL ADVICE.**
> This document is a starting template to define a commercial license for
> ConnectED. It intentionally contains blanks (`[PLACEHOLDER]`) and open
> questions. It has **not** been reviewed by a lawyer and must not be presented
> to a customer as a final agreement until it is. Replace all placeholders, and
> have qualified counsel in the relevant jurisdiction review and finalize it.

Last drafted: 2026-10-10 · Intended model: **retain ownership, license use to
private schools** (see "Business model" below).

---

## 1. Parties

- **Licensor ("the Owner"):** IT Lens, registered at
  [REGISTERED ADDRESS], contact @kazue352 / xennus.dev@gmail.com.
- **Licensee ("the School"):** [SCHOOL / ORGANIZATION LEGAL NAME], registered at
  [SCHOOL ADDRESS], contact [SCHOOL CONTACT].

## 2. Product

"ConnectED" — the school management software described at
https://soemoekyaw-portfolio.netlify.app/, in the version delivered under this
agreement (the "Software").

## 3. Business model (proposed — confirm before use)

The Owner intends to **retain all intellectual property rights** in ConnectED
and to grant schools a **non-exclusive, non-transferable right to use** the
Software under a paid agreement. This section is a statement of intent, not a
term of the license; the operative terms are in §4–§16. If the intended model
changes (for example, self-hosted perpetual vs. subscription), revise this
document.

## 4. License grant

Subject to payment and the terms below, the Owner grants the School a
**non-exclusive, non-transferable, non-sublicensable** license to:

- **install and use** the Software for the School's internal school-management
  purposes;
- **allow the School's authorized users** (administrators, teachers, students,
  parents/guardians, transport staff) to access the Software under accounts the
  School administers;
- **host** the Software [on infrastructure operated by the Owner / on
  infrastructure operated by the School] as selected in Schedule A.

### 4.1 Scope

| Field | Value (fill in) |
| --- | --- |
| Authorized school / organization | `[SCHOOL LEGAL NAME]` |
| Schools covered | `[NUMBER]` |
| Campuses covered | `[NUMBER]` |
| Authorized users / seats | `[NUMBER OR "unlimited within the school"]` |
| Deployment model | `[Owner-hosted subscription / School-hosted]` |
| Term | `[START DATE]` to `[END DATE]` / `[renewal terms]` |
| Fees | `[FEES]` (see §10) |

Use of the Software outside §4.1 is not licensed.

## 5. Ownership and intellectual property

1. The Owner retains all right, title, and interest in and to the Software,
   including all copies and modifications made by or for the Owner.
2. The School receives **no ownership rights**; it receives only the license in §4.
3. **Ownership verification (action required):** Before granting this license
   the Owner must confirm it holds or has secured rights to:
   - all source code contributions (including any contributed by contractors,
     employees, or third parties);
   - brand, logo, icons, images, fonts, and other assets in the repository;
   - any content derived from external sources.
   The repository currently contains an asset with a third-party "All Rights
   Reserved" notice (see `THIRD_PARTY_NOTICES.md`), and dependencies under
   non-permissive licenses. These must be resolved or disclosed before this
   section can be relied upon.

## 6. Restrictions

Except as expressly permitted, the School shall not:

1. redistribute, publish, sublicense, sell, rent, or lease the Software;
2. make the Software available to any entity other than the authorized school
   and its authorized users;
3. use the Software to provide services to third parties;
4. remove copyright, trademark, or attribution notices;
5. use the Software's branding to imply endorsement by the Owner, or by any
   school, without written permission.

## 7. Source-code access

Source code is **not** provided under a standard license. Any source-code
access, escrow, or "source-available" arrangement must be granted **separately
and in writing** in Schedule A, and may carry additional confidentiality
obligations. Absent such a grant, the School receives the running Software only.

## 8. Modification and derivative works

1. The School may [not] modify the Software. Any custom development must be
   agreed in writing (see §15).
2. If modification is expressly permitted, the Owner retains ownership of the
   Software, and the School assigns (or grants the Owner a perpetual,
   irrevocable, worldwide, royalty-free license to) any modifications made to
   the Software, unless Schedule A states otherwise. `[CHOOSE]`
3. Configurations, data the School enters, and school-specific settings remain
   the School's (see §12).

## 9. Reverse engineering

The School shall not reverse engineer, decompile, or disassemble the Software,
except to the extent a restriction is **prohibited by applicable law** in the
School's jurisdiction. `[Confirm jurisdiction-specific carve-outs with counsel.]`

## 10. Fees, payment, and taxes

- Fees: `[FEES]` billed `[period]`, due `[terms]`.
- Late payment: `[TERMS]`.
- Taxes: `[who bears taxes, e.g. VAT]`.
- Price changes/renewal: `[TERMS]`. This section is configurable and must be
  completed before the agreement is used.

## 11. Attribution and notices

The School shall retain all copyright and attribution notices in the Software
and any documentation, and shall include the third-party notices supplied by
the Owner (`THIRD_PARTY_NOTICES.md`) in any permitted redistribution.

## 12. School data

1. **Ownership:** The School owns the data it enters into the Software
   ("School Data"), including student, parent, staff, academic, and transport
   records.
2. **Processing:** Where the Owner hosts or processes School Data, the Owner
   acts as a **data processor** for the School and the School acts as the
   **controller** (or equivalent) for its data. A separate Data Processing
   Agreement (DPA) is required and must reflect `PRIVACY_POLICY.md` and
   applicable law. `[ATTACH DPA]`
3. **Children's data:** The School is responsible for obtaining any required
   consents/notices for students' and families' data, and for complying with
   the applicable child-data, education, and privacy laws in its jurisdiction.

## 13. Suspension and termination

1. Either party may terminate per `[NOTICE PERIOD]` written notice, subject to
   the term in Schedule A.
2. The Owner may suspend or terminate for material breach, non-payment, or
   unlawful use, after `[CURE PERIOD]` where curable.
3. On termination: the School's access ends; the Owner will make available an
   export of School Data in `[FORMAT]` for `[EXPORT WINDOW]`, after which it
   will be deleted per `PRIVACY_POLICY.md`. `[Confirm data-retention and
   deletion obligations with counsel.]`

## 14. Warranty disclaimer

THE SOFTWARE IS PROVIDED "AS IS". THE OWNER DISCLAIMS ALL WARRANTIES, EXPRESS
OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW. The
Software is not represented as production-ready; see
`docs/PRODUCTION_READINESS_CHECKLIST.md`.

## 15. Support, maintenance, and custom development

Support, service levels, maintenance, training, data migration, and custom
development are **optional services**, not part of the base license, unless
listed in Schedule A. See `COMMERCIAL_LICENSE.md` §"Commercial options".

## 16. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OWNER'S TOTAL LIABILITY
IS LIMITED TO `[FEES PAID IN THE PRECEDING 12 MONTHS]`, AND THE OWNER IS NOT
LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, OR LOSS OF
DATA, PROFITS, OR GOODWILL. `[Confirm enforceability and any mandatory
consumer/data-protection carve-outs with counsel.]`

## 17. Third-party components

The Software includes third-party components under their own licenses. The
Owner does not relicense those components and makes no warranty regarding them.
The School's use of those components is subject to their licenses as listed in
`THIRD_PARTY_NOTICES.md`. Notably, some frontend dependencies are under
non-permissive licenses (e.g. the Hippocratic License 2.1 and the GSAP standard
license); see that file before distribution.

## 18. Governing law and disputes

Governing law: `[GOVERNING LAW / JURISDICTION]`. Dispute resolution:
`[COURTS / ARBITRATION]`. Language: `[LANGUAGE]`.

## 19. Entire agreement; precedence

This agreement plus its Schedules is the entire agreement and supersedes prior
discussions. In case of conflict between this document and a signed written
agreement, **the signed agreement controls**, and it may override or supplement
these terms.

---

## Commercial options (proposed — no prices set)

The following offerings are **proposals to be approved by the Owner**, not final
commitments. Prices, scope, and availability are undecided.

| Option | Description | Status |
| --- | --- | --- |
| Single-school license | One school, one campus | Proposed |
| Multi-campus license | One school/operator, multiple campuses | Proposed |
| Enterprise / education-group license | Multiple schools under one operator | Proposed |
| Hosted subscription | Owner-operated hosting, recurring fee | Proposed |
| School-hosted deployment | School or its vendor operates the deployment | Proposed |
| Optional installation & configuration | Assisted setup | Proposed |
| Data migration | Import of existing records | Proposed |
| Training & onboarding | Staff/teacher/parent onboarding | Proposed |
| Maintenance & technical support | Support and updates | Proposed |
| Custom development & integrations | Bespoke features/integrations | Proposed |

### Ownership verification (action required)

Before offering any of the above, the Owner must **confirm in writing** that it
owns or has the right to license:

1. every part of the ConnectED codebase (including past contributors);
2. all brand and visual assets (see the third-party logo issue in
   `THIRD_PARTY_NOTICES.md`);
3. the right to relicense any open-source components that carry copyleft or
   ethical-source terms.

If any of these cannot be confirmed, adjust the license scope or replace the
component before commercial distribution.
