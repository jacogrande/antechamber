# PRD: Schema-driven URL → Onboarding Intake + Assistant Context Pack

**Stack:** TypeScript + Bun + Hono + Vercel Workflow (WDK)

## 0) Executive summary

SaaS onboarding (and AI assistant activation) is slowed by customers re-entering information that’s already on their website. This product lets SaaS teams define a **custom onboarding schema**, then customers provide a **website URL** and receive an **auto-filled draft** with **citations** to sources. Customers confirm/edit once, and the system exports the verified data to the SaaS team’s systems (CRM, onboarding projects, provisioning), and optionally generates an **assistant-ready context pack** (JSON + RAG corpus + guardrails).

We’ll build it as a multi-tenant SaaS with:

- **Hono** API running on **Bun** on Vercel Functions (Bun runtime is supported on Vercel; TS works out of the box). ([Vercel][1])
- **Vercel Workflow** (Workflow DevKit) to orchestrate durable multi-step crawling/extraction pipelines with retry/state persistence (“use workflow” / “use step” semantics). ([Vercel][2])
- A web app (recommended: Next.js on Vercel) for schema configuration + customer review.

---

## 1) Problem statement

### Customer pains

- Onboarding forms are long; customers repeat info that exists on their public website.
- Implementation teams waste time on intake calls.
- Data quality is inconsistent; fields are left blank or answered ambiguously.
- AI assistant products fail early because they lack verified customer context on day 1.

### Company pains

- Slow time-to-value → delayed activation → churn risk.
- Onboarding is expensive and hard to scale.
- Hard to maintain “custom onboarding per customer” without rebuilding flows.

---

## 2) Goals & success criteria

### Goals (MVP → v1)

1. **Reduce time-to-complete intake** by 70–90% for the “company profile” portion.
2. Provide **evidence-first extraction**: every extracted field includes citations or is marked unknown.
3. Allow SaaS teams to define a **schema** (fields, types, instructions, validations) and reuse it across customers.
4. Provide a customer-facing **review + confirm** UX and export confirmed results via webhook/API.
5. Support an optional **assistant context pack** output (structured JSON + source bundle).

### Non-goals (MVP)

- Full authenticated crawling behind logins
- Real-time websocket collaboration (Vercel Functions are not a great fit for long-lived sockets; keep it async)
- Automatic claims without citations (no “guessing”)

### Success metrics

- % fields auto-filled with acceptable confidence
- “Accepted without edits” rate per field
- Median time from URL submission → confirmed export
- Drop-off rate in intake flow
- Hours saved (self-reported / modeled) per onboarding

---

## 3) Target users & personas

1. **CS/Implementation Lead**: wants faster, cleaner intake that creates actionable setup tasks.
2. **RevOps/SalesOps**: wants standardized company profiles pushed to CRM.
3. **AI SaaS PM / Applied AI Engineer**: wants a verified context pack for assistants (RAG + structured tools).
4. **Customer Admin**: wants onboarding to be quick and trustworthy.

---

## 4) Core user journeys

### Journey A: SaaS team creates an onboarding schema

- Admin creates Workspace → Project → Schema
- Defines fields (types, instructions, enum options, validations, required)
- Saves schema version (v1, v2…)

### Journey B: Customer URL → draft → confirm

- Customer receives intake link
- Enters website URL
- System runs workflow: crawl → extract per page → synthesize → validate → generate draft
- Customer reviews fields with citations, edits, confirms
- System exports confirmed data and artifacts

### Journey C: AI assistant context pack

- On confirm, system outputs:
  - `context.json` (structured)
  - `sources[]` (URLs + snippets + timestamps)
  - optional “RAG corpus” chunks + guardrail statements (“may claim” vs “unknown”)

---

## 5) Functional requirements

### 5.1 Schema system (admin-facing)

**MVP field types**

- `string`, `number`, `boolean`, `enum`, `string[]`
- Basic validation rules (regex, min/max length, enum constraints)
- Required/optional, confidence threshold per field
- “Source preference” (e.g., pricing pages > homepage)

**v1 extensions**

- Nested objects/arrays
- Conditional fields (if industry = healthcare → ask HIPAA)
- Templates/packs (B2B SaaS pack, multi-location pack, security pack)

### 5.2 Crawling & content ingestion

**MVP**

- Fetch HTML pages (no JS rendering)
- Use sitemap when available; otherwise crawl top N pages (configurable)
- Heuristics to prioritize: `/about`, `/pricing`, `/contact`, `/security`, `/privacy`, `/terms`
- Respect robots.txt; allowlist domains and rate-limit requests

**Artifacts stored**

- Raw HTML snapshot (compressed)
- Extracted text + metadata

### 5.3 Extraction & Synthesis

Extraction uses a two-phase approach: permissive per-page extraction followed by deterministic synthesis.

**Phase 1: Per-page extraction (LLM)**

- Each crawled page is sent individually to the LLM along with the **full schema**
- The LLM extracts every field it can find on that page, even on partial or weak evidence (low confidence threshold) — e.g., "HIPAA compliant" on a features page partially fills a compliance field
- Every extracted value must cite the source page (url, snippet)
- Produces a set of `ExtractedFieldValue[]` per page, each with a confidence score

**Phase 2: Synthesis / merge (deterministic)**

- Collects all per-page extraction results across every crawled page
- For each schema field, selects the best value: highest confidence, most supporting citations
- Combines citations when multiple pages support the same field value
- Applies `sourceHints` as a **confidence boost** during merge — e.g., a pricing value found on a `/pricing` URL is weighted higher than the same value found on a blog post
- Applies `confidenceThreshold` quality gate per field to assign status:
  - `auto` — confidence meets or exceeds threshold
  - `needs_review` — evidence exists but confidence is below threshold, or conflicting values were found across pages
  - `unknown` — no page provided any evidence for this field
- Flags contradictory extractions (different values from different pages) as `needs_review` with a reason

**Post-processing**

- Normalization: phone numbers, addresses, canonical company name formatting
- Schema constraint validation: regex, min/max length, enum membership

**Output data model**

- `DraftSubmission` with fields:
  - `value`
  - `confidence`
  - `citations[]` (url, snippet, offsets)
  - `status` (auto / needs_review / unknown)

### 5.4 Review & confirmation UX (customer-facing)

**Must-haves**

- Show extracted values with citations per field
- Inline edit with “mark as corrected”
- “Ask only missing questions” panel for unknown/low-confidence required fields
- Confirm & submit

### 5.5 Export & integrations

**MVP**

- Webhook POST to customer-configured endpoint on confirm
- API endpoint to fetch confirmed submission + artifacts
- CSV export

**v1**

- Native integrations: HubSpot, Salesforce, Zapier, Rocketlane
- “Provisioning hooks”: call customer’s internal “create account/config defaults” endpoint

### 5.6 Governance, audit, observability

- Schema versioning + diffs
- Audit log of: who edited what, when, and which sources
- Workflow run logs with step timings and retries (Workflow provides durability/observability primitives). ([Vercel][3])

---

## 6) System architecture (TypeScript + Bun + Hono + Vercel Workflow)

### 6.1 High-level components

1. **Web app** (recommended Next.js)
   - Admin console: schema builder, runs, exports, settings
   - Customer review UI

2. **API service (Hono on Bun)**
   - Auth, schemas, submissions, webhooks
   - Runs on Vercel Functions using Bun runtime ([Vercel][1])
   - Hono deploy path on Vercel is supported ([Hono][4])

3. **Workflow service (Vercel Workflow / WDK)**
   - Orchestrates crawl + extract + validate
   - Durable steps with retries/persistence (“use workflow” / “use step”). ([Vercel][2])

4. **Storage**
   - Postgres (primary): tenants, schemas, submissions, audit logs
   - Object storage (S3/R2): crawl snapshots, extracted text, chunked corpus

5. **LLM provider**
   - Pluggable: supports OpenAI/Anthropic/etc.
   - Must support structured JSON output + citations mapping.

---

## 7) Data model (TypeScript types)

```ts
export type TenantId = string;
export type UserId = string;
export type SchemaId = string;
export type SubmissionId = string;
export type WorkflowRunId = string;

export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]";

export interface FieldDefinition {
  key: string; // e.g. "company.industry"
  label: string; // "Industry"
  type: FieldType;
  required: boolean;
  instructions: string; // prompt-ish, human authored
  enumOptions?: string[];
  validation?: {
    regex?: string;
    minLen?: number;
    maxLen?: number;
  };
  confidenceThreshold?: number; // 0..1
  sourceHints?: string[]; // e.g. ["pricing", "about", "security"]
}

export interface SchemaVersion {
  schemaId: SchemaId;
  version: number;
  name: string;
  fields: FieldDefinition[];
  createdAt: string;
  createdBy: UserId;
}

export interface Citation {
  url: string;
  snippet: string;
  pageTitle?: string;
  retrievedAt: string;
}

export type FieldStatus = "auto" | "needs_review" | "unknown" | "user_edited";

export interface ExtractedFieldValue {
  key: string;
  value: unknown; // validate based on FieldDefinition.type
  confidence: number; // 0..1
  citations: Citation[];
  status: FieldStatus;
  reason?: string; // short model explanation
}

export interface SubmissionDraft {
  submissionId: SubmissionId;
  tenantId: TenantId;
  schemaId: SchemaId;
  schemaVersion: number;
  websiteUrl: string;
  fields: ExtractedFieldValue[];
  createdAt: string;
  workflowRunId: WorkflowRunId;
}

export interface SubmissionConfirmed extends SubmissionDraft {
  confirmedAt: string;
  confirmedBy: "customer" | "internal";
}
```

---

## 8) API surface (Hono)

**Auth**

- `POST /api/auth/login`
- `POST /api/auth/logout`

**Schemas**

- `POST /api/schemas` (create)
- `POST /api/schemas/:schemaId/versions` (publish new version)
- `GET /api/schemas/:schemaId/versions/:version`

**Submissions**

- `POST /api/submissions`
  Body: `{ schemaId, schemaVersion?, websiteUrl, customerMeta? }`
  Returns: `{ submissionId, workflowRunId }`

- `GET /api/submissions/:submissionId` (draft or confirmed)

- `POST /api/submissions/:submissionId/confirm` (customer confirm + edits)

- `GET /api/submissions/:submissionId/artifacts` (links to stored crawl/text)

**Webhooks**

- `POST /api/webhooks` (register endpoint + secret)
- On confirm, system sends: `POST {endpoint}` with signed payload.

**Assistant pack**

- `GET /api/submissions/:submissionId/context-pack`
  Returns: `context.json + sources + optional chunks`

---

## 9) Workflow design (Vercel Workflow / WDK)

Vercel Workflow turns async functions into durable workflows with directives and handles retries/state persistence. ([Vercel][2])

### Workflow: `generate_onboarding_draft(submissionId)`

**Steps**

1. **Validate input**
   - Normalize URL, enforce allowlist/denylist, create run record

2. **Discover pages**
   - Fetch `robots.txt`, sitemap; choose up to N pages

3. **Fetch pages**
   - Rate limited; store raw HTML snapshots

4. **Extract text**
   - Strip HTML to clean text + metadata (title, headings, meta description)

5. **Extract fields per page**
   - LLM call per page: full schema + single page's extracted text
   - Permissive extraction — extract on partial/weak evidence with low confidence threshold
   - Every value must cite the current page

6. **Synthesize fields**
   - Deterministic merge of all per-page extraction results
   - Pick best value per field (highest confidence, most citations)
   - Combine citations when multiple pages support the same field
   - Apply `sourceHints` as confidence boost signal
   - Apply `confidenceThreshold` quality gate → assign `auto` / `needs_review` / `unknown`
   - Flag conflicting values as `needs_review`

7. **Validate + normalize**
   - Enforce schema constraints (regex, min/max, enum); normalize formatting

8. **Persist draft + notify**
   - Write `SubmissionDraft` to database; send "draft ready" notification (email/webhook, optional)

### Reliability requirements

- Automatic retries for transient fetch/LLM failures
- Step-level timeout + max retry policy
- Idempotency: re-running a submission doesn’t duplicate artifacts

---

## 10) Security, privacy, compliance

**Principles**

- Respect robots.txt and customer consent expectations
- Store minimal data; configurable retention
- Never claim info without citations (“no-source → unknown”)
- Audit logs for edits and exports

**Controls**

- Per-tenant encryption keys (or envelope encryption)
- Signed webhooks
- Role-based access: Admin, Editor, Viewer
- PII handling: detect and redact from logs

---

## 11) Performance & SLOs

- Draft generation: **P50 < 60s**, **P95 < 5 min** (depends on crawl depth)
- Availability: 99.9% for API endpoints
- Webhook delivery: at-least-once, with retry and replay UI

---

## 12) Milestones (build order)

### MVP (4–6 weeks)

- Tenant + schema builder (flat fields)
- Submission create → workflow run → draft saved
- Customer review UI with citations + inline edits
- Confirm + webhook export
- Basic artifact storage + audit logs

### v1 (6–10 more weeks)

- Nested schema + conditional fields
- Minimal follow-up questions for unknown required fields
- HubSpot/Salesforce/Zapier integrations
- Continuous refresh + drift detection (optional cron-triggered re-crawl)

---

## 13) Open questions (decide during MVP)

1. **JS rendering**: do we need headless browser for many targets, or is HTML fetch enough for beachhead segments?
2. **LLM provider strategy**: single provider vs pluggable from day one.
3. **Pricing metric**: per onboarding run vs per field vs per page crawl.
4. **Customer consent UX**: “I confirm I have rights to provide this URL” vs deeper controls.

---

## 14) Implementation notes specific to the requested stack

- **Bun on Vercel Functions**: supported and configured via Vercel runtime; TypeScript supported for `.ts` function files. ([Vercel][1])
- **Hono on Vercel**: documented deployment path and starter templates exist. ([Hono][4])
- **Vercel Workflow / WDK**: use durable directives to orchestrate crawl/extract steps with retries and persistence. ([Vercel][2])

[1]: https://vercel.com/docs/functions/runtimes/bun?utm_source=chatgpt.com "Using the Bun Runtime with Vercel Functions"
[2]: https://vercel.com/docs/workflow?utm_source=chatgpt.com "Vercel Workflow"
[3]: https://vercel.com/blog/introducing-workflow?utm_source=chatgpt.com "Built-in durability: Introducing Workflow Development Kit"
[4]: https://hono.dev/docs/getting-started/vercel?utm_source=chatgpt.com "Vercel"
