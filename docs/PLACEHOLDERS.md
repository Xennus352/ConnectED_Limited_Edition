# ConnectED — Placeholder Index (what to replace later)

> **Status: internal working note.** This page is an index, not a legal
> document. It lists the placeholders used across the commercial and legal
> drafts so they can be found and replaced in one pass when the project's
> situation changes.
>
> **IT Lens is a planned brand/project name only — it is not a registered
> company or legal entity.** ConnectED is **not yet commercially available**, and
> no official contact details, product website, or public demo exist yet. Do not
> describe IT Lens as a registered company, or publish any contact/website/demo
> detail, until it is genuinely in place.

Last updated: 2026-10-10.

---

## How to find every placeholder

Placeholders are uppercase tokens in square brackets. To list them:

```bash
grep -rn '\[[A-Z]' README.md LICENSE *.md docs/*.md
```

The snippets below group the most important ones by **when** you would replace
them.

---

## 1. Identity, brand, contact, website

Replace these when you **register a business, choose the contracting party,
obtain a dedicated domain, and establish official contact details**.

| Placeholder | Where it appears | Replace with | When |
| --- | --- | --- | --- |
| `[CONTRACTING PARTY LEGAL NAME — TO BE FINALIZED]` | `LICENSE`, `COMMERCIAL_LICENSE.md`, `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md` | The exact registered legal name of the contracting party | You finalize the legal structure |
| `[REGISTERED ADDRESS — TO BE FINALIZED]` | `LICENSE`/`COMMERCIAL_LICENSE.md` | The registered address of the contracting party | You have a registered address |
| `[CONTACT EMAIL]` | `README.md`, `LICENSE`, legal drafts, `docs/SALES_PREPARATION.md` | The official product/business email | You establish an official contact |
| `[OFFICIAL CONNECTED WEBSITE — NOT YET AVAILABLE]` | `README.md`, legal drafts | The official product website/domain | You obtain a dedicated domain |
| `[CONTACT PHONE — OPTIONAL]` | `docs/SALES_PREPARATION.md` | A business phone number (optional) | Optional |
| `[EFFECTIVE DATE]` | `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md` | The date the document takes effect | You are ready to publish |

> The brand name **IT Lens** is used as a _planned brand_. It is intentionally
> **not** presented as a registered entity anywhere. If you later formalize a
> company, update the names in the identity rows above rather than editing
> "IT Lens" everywhere.

---

## 2. Commercial terms (pricing, term, SLA, liability, DPA)

Replace these when you **define the commercial offer**. They currently have no
values because no offer has been finalized.

| Placeholder | Where it appears | What it needs |
| --- | --- | --- |
| `[FEES]` | `COMMERCIAL_LICENSE.md`, `TERMS_OF_SERVICE.md` | Pricing model and amounts |
| `[FEES PAID IN THE PRECEDING 12 MONTHS]` | `TERMS_OF_SERVICE.md` | Liability cap basis |
| `[LIABILITY CAP AND EXCLUSIONS]` | `TERMS_OF_SERVICE.md` | Agreed liability limits |
| `[NUMBER]` | `COMMERCIAL_LICENSE.md` | Schools/campuses covered per tier |
| `[START DATE]` / `[END DATE]` | `COMMERCIAL_LICENSE.md` | License term |
| `[TERM / EXCLUSIONS]`, `[TERMS]`, `[CURE PERIOD]`, `[NOTICE PERIOD]`, `[NOTICE]`, `[NOTICE / CURE]` | legal drafts | Payment, renewal, and termination terms |
| `[SLA PLACEHOLDERS]`, `[SUPPORT SCOPE]`, `[SCOPE]`, `[RPO / RTO]`, `[WINDOW]` | `TERMS_OF_SERVICE.md`, `COMMERCIAL_LICENSE.md` | Availability, support, and recovery targets |
| `[GOVERNING LAW / JURISDICTION]`, `[GOVERNING LAW]`, `[JURISDICTION]`, `[COURTS / ARBITRATION]`, `[LANGUAGE]` | legal drafts | Dispute-resolution terms |
| `[SERVICE DESCRIPTION / SCHEDULE]`, `[CONFIGURABLE PLACEHOLDERS]` | `COMMERCIAL_LICENSE.md` | What each tier includes |
| `[PLACEHOLDER]` (generic) | throughout | Any remaining blank |

---

## 3. Customer-specific fields (filled per school)

These are filled **per customer** when a deal is signed — not part of your own
identity.

| Placeholder | Where it appears |
| --- | --- |
| `[SCHOOL / ORGANIZATION LEGAL NAME]` | `COMMERCIAL_LICENSE.md` |
| `[SCHOOL LEGAL NAME]`, `[SCHOOL ADDRESS]`, `[SCHOOL CONTACT]` | legal drafts |
| `[ATTACH DPA]`, `[CONFIRM AND DOCUMENT IN A DPA]`, `[LIST ACTUAL PROVIDERS]` | DPA / privacy drafts |

---

## 4. Privacy & operational placeholders

Replace these when you **operate a real deployment** and can state real
retention, process, and provider facts.

| Placeholder | Where it appears |
| --- | --- |
| `[DEFINE]`, `[PROCESS]`, `[DEFINE NOTIFICATION TIMELINE AND CHANNELS]` | `PRIVACY_POLICY.md` |
| `[DEFINE AND TEST DELETION PROCEDURE.]` | `PRIVACY_POLICY.md` |
| `[RETENTION SCHEDULE]`, `[RETENTION FOR LOCATION DATA]`, `[EXPORT WINDOW]`, `[NETWORK]`-style data windows | `PRIVACY_POLICY.md` |
| `[REGION]`, `[RPO / RTO]` | privacy / operational drafts |
| `[IDENTIFY]`, `[IDENTIFY APPLICABLE MYANMAR LAWS]` | `PRIVACY_POLICY.md` |

---

## Reminder before publishing anything externally

1. Confirm IT Lens is described as a **planned brand** (or update it once a
   legal entity exists).
2. Replace the **contact**, **website**, and **demo** placeholders only with
   real, official values.
3. Do **not** add testimonials, school counts, certifications, awards, or
   integrations that do not exist.
4. Have qualified counsel review `LICENSE`, `COMMERCIAL_LICENSE.md`,
   `TERMS_OF_SERVICE.md`, and `PRIVACY_POLICY.md` before you rely on them.
