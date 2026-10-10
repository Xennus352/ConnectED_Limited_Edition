# ConnectED — License Enforcement: Audit & Proposed Architecture

> **Status: PROPOSAL ONLY. Nothing in this document is implemented.** It is a
> design note to be reviewed and approved before any code is written. No license
> enforcement, telemetry, kill switch, or billing exists in the current codebase.
>
> Last reviewed: 2026-10-10.

---

## 1. Current state (verified)

- **There is no license-management system.** A repository-wide search for
  `license`, `entitlement`, and `subscription` in `server/src` and `client/src`
  found only unrelated uses (e.g. "fleet-wide subscription" referring to a
  Socket.IO room).
- There is **no license/tenant model** in `server/prisma/schema.prisma`.
- Authentication is per-user JWT; there is no notion of a licensed school,
  campus, seat count, expiration, or entitlement check.

**Conclusion:** enforcement would be a **net-new subsystem**, not an extension of
anything that exists.

---

## 2. Recommendation

1. **Do not rush enforcement.** A premature or aggressive mechanism can lock a
   paying school out of its own data — a severe commercial and ethical risk.
2. **Start with commercial governance, not code.** A signed license agreement
   (`COMMERCIAL_LICENSE.md`) and clear scope (schools, campuses, seats, term)
   deliver most of the value with none of the lock-out risk.
3. **If technical enforcement is later required**, build it **offline-first,
   server-side, and graceful**, per §4–§7, with an explicit "never brick the
   school's data" principle.

### Explicit non-goals (must not be built)

- ❌ Remote **kill switches** that disable a school without warning.
- ❌ **Hidden telemetry** that phones home without disclosure and consent.
- ❌ **Hard-coded master keys** or back-doors in the source.
- ❌ Any mechanism that can make a school **unable to access or export its own
  data** because of a licensing failure.
- ❌ Mandatory **external license-server** calls that break the app when the
  network or the vendor is unavailable.
- ❌ Payment processing (a separate concern; see §9).

---

## 3. Design principles

1. **Offline-first / fail-open on availability, fail-closed on new entitlements.**
   A missing or unreachable license server must not stop the school using the
   software it already has. Only *new* entitlements (e.g. adding a campus) are
   gated.
2. **Server-side is the source of truth.** Never rely on frontend checks alone;
   a client-side flag is cosmetic and trivially bypassed.
3. **Graceful degradation.** On expiry, enter a clearly-communicated read-only or
   warnings mode long before any restriction, and always preserve read/export.
4. **Auditable.** Every license change is logged.
5. **Reversible.** A super-admin can always restore access; recovery does not
   require contacting a remote service.
6. **Non-breaking.** Local development and existing authentication must keep
   working without a license.

---

## 4. Proposed data model (illustrative — not final)

If approved, extend the schema in a **tenant-aware** way (this depends on the
multi-tenancy decision in `docs/SECURITY_AND_MULTI_TENANCY_AUDIT.md` §3):

```
model License {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId       String                      // tenant this license covers
  status         String                      // active | grace | expired | suspended
  licensedName   String                      // the licensed school/organization
  seats          Int?                        // optional authorised-user cap
  campuses       Int?                        // optional campus cap
  issuedAt       DateTime
  validFrom      DateTime
  validUntil     DateTime
  gracePeriodDays Int      @default(30)
  features       String[]                    // optional entitlement flags
  issuedBy       String                      // who issued it
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model LicenseAuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  licenseId  String
  actorId    String
  actorModel String
  action     String   // issued | renewed | extended | suspended | reinstated | expired
  detail     String?
  createdAt  DateTime @default(now())
}
```

> Add `schoolId` only as part of the multi-tenancy work, not ad hoc.

---

## 5. Server-side enforcement

- A single **entitlement middleware / service** evaluates the license for the
  authenticated user's tenant on each request that requires a licensed
  capability.
- Entitlement checks are **centralized** (like the existing `lib/authz.ts`
  scopes) so no route can forget them.
- Checks cover **entitlements**, not routine reads of existing data: e.g.
  allowing sign-in, reads, and exports to continue during expiry/grace.
- The evaluation result and reason are returned in a structured way so the UI can
  show a clear banner rather than a bare 403.

**Suggested evaluation rules:**

| State | Behaviour |
| --- | --- |
| `active`, in term | Full access. |
| `grace` (past `validUntil`, within grace) | Full access + prominent renewal warning. |
| `expired` (past grace) | Read/export only; no new users/classes; no new campuses. |
| `suspended` (admin action, e.g. non-payment) | Read/export only. |
| no license record | Development/local = full access; production = read-only until provisioned (configurable). |

---

## 6. Administrative management

- A **super-admin-only** area (or a separate vendor-only tool) to view licenses,
  extend the term, adjust seats/campuses, suspend/reinstate, and view the audit
  log.
- Because there is currently no separation between "vendor" and "school admin",
  decide whether license management belongs to the vendor (recommended, in a
  separate tool) or to a super-admin. **If a school's super-admin can edit their
  own license, the enforcement is advisory at best.**
- Every mutation writes a `LicenseAuditLog` row.

---

## 7. Provisioning, renewal, and expiry handling

- **Provisioning (offline):** issue a signed license document (e.g. a signed
  JSON/JWT-like artifact with a public-key signature) that can be installed into
  the deployment. Verification uses a **public key embedded in the product**;
  the **private key stays with the vendor**. This avoids mandatory network calls.
- **Renewal:** issue a new license document; installing it is the renew action.
- **Optional online check (off by default):** if later enabled, it must be
  optional, disclosed, and must **not** be required for the app to function.
- **Expiration:** follow the graceful rules in §5. Never delete data on expiry.
  Always allow export.
- **Recovery:** a documented, offline recovery path restores access without a
  remote service.

---

## 8. Security considerations

- License documents are **signed and verified**, not merely present.
- No private signing keys in the repository or client bundle.
- The public verification key in the client is fine (it only verifies, it does
  not grant); the **authoritative check is server-side**.
- Rate-limit and audit any license endpoints.
- Do not log license secrets.

---

## 9. Out of scope (separate initiatives)

- **Billing / payments / invoicing:** not implemented and not requested. Adding a
  payment gateway is a distinct project with its own security, PCI, and legal
  considerations.
- **Usage metering for billing:** only if the business model requires it, and
  with disclosure.

---

## 10. Recommended path

1. Finalize the **commercial license terms** and scope (`COMMERCIAL_LICENSE.md`).
2. Decide the **tenancy model** (one deployment per school vs. multi-tenant).
3. **If and only if** enforcement is needed, implement §4–§7 with fail-open
   availability, graceful expiry, server-side authority, and audit logging.
4. Add tests that prove a school can **always read and export its own data** even
   when a license is expired/suspended/missing.

> Do not start this work until items 1–2 are decided and a design review has
> approved the approach.
