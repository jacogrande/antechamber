# MVP Sprint Plan

**Scope:** Everything listed under PRD §12 "MVP (4–6 weeks)" — tenant + schema builder, submission → workflow → draft, customer review with citations, confirm + webhook export, artifact storage + audit logs.

**Phases are ordered by dependency.** Each phase produces a working, testable increment. Later phases depend on earlier ones.

---

## Phase 1: Foundation & Data Layer

Stand up the project skeleton, database, auth, and multi-tenancy so that all subsequent phases have infrastructure to build on.

- [x] Project structure: Hono router organization, shared middleware, error handling, env/config loading
- [x] Postgres connection and migration tooling (e.g. Drizzle or Kysely)
- [x] Core tables: `tenants`, `users`, `tenant_memberships` (with role: admin/editor/viewer)
- [x] TypeScript domain types from PRD §7 (`FieldDefinition`, `SchemaVersion`, `Citation`, `ExtractedFieldValue`, `SubmissionDraft`, `SubmissionConfirmed`)
- [x] Auth endpoints (`POST /api/auth/login`, `POST /api/auth/logout`) + session/token middleware
- [x] Multi-tenant scoping middleware (all queries filtered by `tenantId` from auth context)
- [x] Object storage client setup (S3 or R2) for artifact uploads in later phases
- [x] Test harness: `bun test` with a test database seeding strategy

**Exit criteria:** Authenticated requests resolve a tenant context. Migrations run cleanly. A health-check endpoint returns 200.

---

## Phase 2: Schema System

Build the admin-facing schema CRUD — the foundation that every submission depends on.

- [x] Database tables: `schemas` (tenant-scoped) + `schema_versions` (immutable, JSONB fields column storing `FieldDefinition[]`)
- [x] `POST /api/schemas` — create a new schema within a tenant (schema + version 1 atomically)
- [x] `POST /api/schemas/:schemaId/versions` — publish a new version with `FOR UPDATE` row locking
- [x] `GET /api/schemas/:schemaId/versions/:version` — retrieve a specific version
- [x] Field definition validation: enforce allowed `FieldType` values, validate `enumOptions` presence for enum type, validate `validation` rules (regex compiles, min ≤ max), reject empty `instructions`, upper bounds on all string/array sizes
- [x] Schema version immutability: published versions cannot be mutated, only new versions created
- [x] Tests: CRUD operations, validation rejection cases, tenant isolation, version ordering (29 tests)

**Exit criteria:** An admin can create a schema, publish versions, and retrieve them. Invalid field definitions are rejected with clear errors.

---

## Phase 3: Crawling & Content Pipeline

Build the standalone modules that fetch and parse web pages. These are pure functions / services with no workflow orchestration yet — testable in isolation.

- [x] URL normalization and validation (reject non-HTTP, private IPs, etc.)
- [x] `robots.txt` fetcher + parser (respect disallow rules)
- [x] Sitemap discovery (`/sitemap.xml`, sitemap index) + fallback to heuristic page list (`/about`, `/pricing`, `/contact`, `/security`, `/privacy`, `/terms`)
- [x] HTML page fetcher: rate-limited (configurable concurrency + delay), respects robots.txt, stores raw HTML snapshots (compressed) to object storage
- [x] Text extraction: strip HTML to clean text + metadata (title, headings, meta description)
- [x] Artifact persistence: save raw HTML + extracted text, keyed by `(submissionId, url)`
- [x] Tests: robots.txt parsing, URL normalization edge cases, text extraction from sample HTML

**Exit criteria:** Given a domain, the pipeline discovers pages, fetches them respecting robots.txt, extracts clean text, and stores artifacts. All testable without a database via dependency injection.

---

## Phase 4: LLM Extraction & Synthesis Engine

Build the two-phase extraction pipeline: permissive per-page LLM extraction followed by deterministic synthesis/merge.

### Per-page extraction (LLM)

- [x] LLM client abstraction (start with one provider — OpenAI or Anthropic; pluggable interface for later)
- [x] Prompt construction: combine full `FieldDefinition[]` (labels, instructions, types) with a **single page's** extracted text — each page is processed independently against the full schema
- [x] Permissive extraction: low confidence threshold — the LLM should extract fields even on partial or weak evidence (e.g., "HIPAA compliant" mentioned on a features page partially fills a compliance field)
- [x] Structured output parsing: LLM returns JSON matching the `ExtractedFieldValue[]` shape; validate against schema field types
- [x] Citation requirement: every extracted value must cite the current page (url, snippet, pageTitle, retrievedAt)
- [x] Confidence scoring: model-provided 0–1 score per field

### Synthesis / merge (deterministic)

- [x] Collect all per-page extraction results across every crawled page
- [x] For each schema field, select the best value: highest confidence, most supporting citations
- [x] Combine citations when multiple pages support the same field value
- [x] Apply `sourceHints` as a **confidence boost** during merge — e.g., a pricing value found on a `/pricing` URL is weighted higher than the same value on a blog post
- [x] Apply `confidenceThreshold` quality gate per field to assign final status:
  - `auto` — confidence meets or exceeds threshold
  - `needs_review` — evidence exists but confidence is below threshold, or conflicting values found across pages
  - `unknown` — no page provided any evidence for this field
- [x] Flag contradictory extractions (different values from different pages) as `needs_review` with a reason

### Post-processing

- [x] Normalization: phone numbers, addresses, canonical company name formatting
- [x] Schema constraint validation: regex, min/max length, enum membership — reject or flag violations

### Tests

- [x] Per-page extraction with fixture pages and mocked LLM responses
- [x] Merge logic with overlapping extractions (same field found on multiple pages)
- [x] Merge logic with conflicting extractions (different values for same field)
- [x] `sourceHints` confidence boost behavior
- [x] Normalization functions
- [x] `confidenceThreshold` quality gate status assignment

**Exit criteria:** Given a schema and a set of crawled pages, the per-page extractor produces field values with citations per page (mocked LLM), and the synthesis step merges them into well-formed `ExtractedFieldValue[]` with correct confidence scores, combined citations, and status flags. `sourceHints` boost and conflict detection work correctly.

---

## Phase 5: Workflow Orchestration

Wire phases 3 and 4 together into a durable Vercel Workflow, triggered by the submission creation endpoint.

- [x] Database tables: `submissions` (draft + confirmed states), `workflow_runs` (status, step progress, error log)
- [x] `POST /api/submissions` — accepts `{ schemaId, schemaVersion?, websiteUrl, customerMeta? }`, creates submission record, triggers workflow, returns `{ submissionId, workflowRunId }`
- [x] Vercel Workflow `generate_onboarding_draft(submissionId)` with durable steps:
  1. **Validate input** — normalize URL, enforce allowlist/denylist, create run record
  2. **Discover pages** — robots.txt + sitemap + heuristic fallback
  3. **Fetch pages** — rate-limited HTML fetch, store raw HTML snapshots
  4. **Extract text** — strip HTML to clean text + metadata (title, headings, meta description)
  5. **Extract fields per page** — LLM call per page with full schema + single page text; permissive extraction
  6. **Synthesize fields** — deterministic merge of per-page results; apply `sourceHints` boost, `confidenceThreshold` gate, flag conflicts
  7. **Validate + normalize** — enforce schema constraints (regex, min/max, enum); normalize formatting
  8. **Persist draft + notify** — write `SubmissionDraft` to database; send "draft ready" notification (optional)
- [x] Step-level retry policies and timeouts (transient fetch/LLM failures)
- [x] Idempotency: re-triggering a submission reuses existing artifacts rather than duplicating
- [x] `GET /api/submissions/:submissionId` — returns current draft or confirmed state + workflow status
- [x] Tests: workflow step sequencing with mocked crawl + extraction, idempotency verification, failure/retry scenarios (29 tests)

**Exit criteria:** Creating a submission triggers the full pipeline end-to-end. A draft with per-page extractions merged via synthesis, combined citations, confidence scores, and correct status flags is persisted and retrievable via API. Workflow failures retry gracefully.

---

## Phase 6: Review, Export & Audit

Build the customer-facing confirmation flow, data export, and audit trail — the last mile that turns a draft into confirmed, exported data.

- [ ] `POST /api/submissions/:submissionId/confirm` — accepts customer edits (field overrides with `status: "user_edited"`), writes `SubmissionConfirmed` record
- [ ] Customer review UI: display extracted values with inline citations, allow edits with "mark as corrected", surface unknown/needs_review fields prominently, confirm button
- [ ] Webhook system:
  - `POST /api/webhooks` — register endpoint URL + secret per tenant
  - On confirm: deliver signed `POST` payload to registered endpoints
  - At-least-once delivery with retry (exponential backoff)
- [ ] `GET /api/submissions/:submissionId/artifacts` — return links to stored crawl snapshots + extracted text
- [ ] CSV export of confirmed submission data
- [ ] `GET /api/submissions/:submissionId/context-pack` — return `context.json` + `sources[]` bundle
- [ ] Audit log: record schema changes, submission creation, field edits (who, when, old/new value, source), confirm events, webhook deliveries
- [ ] Tests: confirm flow (with and without edits), webhook delivery + signature verification, CSV export formatting, audit log completeness

**Exit criteria:** A customer can review a draft, edit fields, confirm, and the confirmed data is exported via webhook and accessible via API. All mutations are audit-logged. The full journey from schema creation → URL submission → draft → review → confirm → export works end-to-end.

---

## Cross-cutting concerns (address throughout all phases)

- **Error handling:** Consistent error response shape across all endpoints (status code, error code, message)
- **Input validation:** Zod or similar for all request bodies at the API boundary
- **Logging:** Structured JSON logs with `tenantId`, `submissionId`, `requestId` correlation
- **Environment config:** Secrets and configuration via environment variables (database URL, object storage credentials, LLM API key, webhook signing key)
