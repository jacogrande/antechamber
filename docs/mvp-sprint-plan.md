# MVP Sprint Plan

**Scope:** Everything listed under PRD §12 "MVP (4–6 weeks)" — tenant + schema builder, submission → workflow → draft, customer review with citations, confirm + webhook export, artifact storage + audit logs.

**Phases are ordered by dependency.** Each phase produces a working, testable increment. Later phases depend on earlier ones.

---

## Phase 1: Foundation & Data Layer

Stand up the project skeleton, database, auth, and multi-tenancy so that all subsequent phases have infrastructure to build on.

- [ ] Project structure: Hono router organization, shared middleware, error handling, env/config loading
- [ ] Postgres connection and migration tooling (e.g. Drizzle or Kysely)
- [ ] Core tables: `tenants`, `users`, `tenant_memberships` (with role: admin/editor/viewer)
- [ ] TypeScript domain types from PRD §7 (`FieldDefinition`, `SchemaVersion`, `Citation`, `ExtractedFieldValue`, `SubmissionDraft`, `SubmissionConfirmed`)
- [ ] Auth endpoints (`POST /api/auth/login`, `POST /api/auth/logout`) + session/token middleware
- [ ] Multi-tenant scoping middleware (all queries filtered by `tenantId` from auth context)
- [ ] Object storage client setup (S3 or R2) for artifact uploads in later phases
- [ ] Test harness: `bun test` with a test database seeding strategy

**Exit criteria:** Authenticated requests resolve a tenant context. Migrations run cleanly. A health-check endpoint returns 200.

---

## Phase 2: Schema System

Build the admin-facing schema CRUD — the foundation that every submission depends on.

- [ ] Database tables: `schemas`, `schema_versions`, `field_definitions`
- [ ] `POST /api/schemas` — create a new schema within a tenant
- [ ] `POST /api/schemas/:schemaId/versions` — publish a new version with a set of `FieldDefinition`s
- [ ] `GET /api/schemas/:schemaId/versions/:version` — retrieve a specific version
- [ ] Field definition validation: enforce allowed `FieldType` values, validate `enumOptions` presence for enum type, validate `validation` rules (regex compiles, min ≤ max), reject empty `instructions`
- [ ] Schema version immutability: published versions cannot be mutated, only new versions created
- [ ] Tests: CRUD operations, validation rejection cases, version ordering

**Exit criteria:** An admin can create a schema, publish versions, and retrieve them. Invalid field definitions are rejected with clear errors.

---

## Phase 3: Crawling & Content Pipeline

Build the standalone modules that fetch, parse, and classify web pages. These are pure functions / services with no workflow orchestration yet — testable in isolation.

- [ ] URL normalization and validation (reject non-HTTP, private IPs, etc.)
- [ ] `robots.txt` fetcher + parser (respect disallow rules)
- [ ] Sitemap discovery (`/sitemap.xml`, sitemap index) + fallback to heuristic page list (`/about`, `/pricing`, `/contact`, `/security`, `/privacy`, `/terms`)
- [ ] HTML page fetcher: rate-limited (configurable concurrency + delay), respects robots.txt, stores raw HTML snapshots (compressed) to object storage
- [ ] Text extraction: strip HTML to clean text + metadata (title, headings, meta description)
- [ ] Page classifier: tag each page with a category (about, pricing, contact, security, legal, other) — can start rule-based, swap to LLM later
- [ ] Artifact persistence: save raw HTML + extracted text + classification result, keyed by `(submissionId, url)`
- [ ] Tests: robots.txt parsing, URL normalization edge cases, text extraction from sample HTML, classification accuracy on fixture pages

**Exit criteria:** Given a domain, the pipeline discovers pages, fetches them respecting robots.txt, extracts clean text, classifies pages, and stores artifacts. All testable without a database via dependency injection.

---

## Phase 4: LLM Extraction Engine

Build the module that takes a schema + crawled page content and produces `ExtractedFieldValue[]` with citations.

- [ ] LLM client abstraction (start with one provider — OpenAI or Anthropic; pluggable interface for later)
- [ ] Prompt construction: combine `FieldDefinition[]` (labels, instructions, types, source hints) with page excerpts, ordered by classification relevance to each field's `sourceHints`
- [ ] Structured output parsing: LLM returns JSON matching the `ExtractedFieldValue[]` shape; validate against schema field types
- [ ] Citation mapping: each extracted value must include `Citation` objects (url, snippet, pageTitle, retrievedAt); fields without evidence get `status: "unknown"`
- [ ] Confidence scoring: model-provided 0–1 score per field; fields below `confidenceThreshold` get `status: "needs_review"`
- [ ] Post-processing normalization: phone numbers, addresses, canonical company name formatting
- [ ] Schema constraint validation: regex, min/max length, enum membership — reject or flag violations
- [ ] Tests: prompt construction with fixture schemas, structured output parsing with sample LLM responses (mocked), citation presence enforcement, normalization functions

**Exit criteria:** Given a schema and a set of crawled/classified pages, the engine returns well-formed `ExtractedFieldValue[]` with citations, confidence scores, and correct status flags. Works with mocked LLM responses in tests.

---

## Phase 5: Workflow Orchestration

Wire phases 3 and 4 together into a durable Vercel Workflow, triggered by the submission creation endpoint.

- [ ] Database tables: `submissions` (draft + confirmed states), `workflow_runs` (status, step progress, error log)
- [ ] `POST /api/submissions` — accepts `{ schemaId, schemaVersion?, websiteUrl, customerMeta? }`, creates submission record, triggers workflow, returns `{ submissionId, workflowRunId }`
- [ ] Vercel Workflow `generate_onboarding_draft(submissionId)` with durable steps:
  1. **Validate input** — normalize URL, enforce allowlist/denylist, create run record
  2. **Discover pages** — robots.txt + sitemap + heuristic fallback
  3. **Fetch pages** — rate-limited HTML fetch, store artifacts
  4. **Classify pages** — tag each page
  5. **Extract fields** — LLM call with schema + selected excerpts
  6. **Validate + normalize** — enforce schema constraints, set status flags
  7. **Persist draft** — write `SubmissionDraft` to database
  8. **Notify** — mark workflow complete (email/webhook notification is stretch)
- [ ] Step-level retry policies and timeouts (transient fetch/LLM failures)
- [ ] Idempotency: re-triggering a submission reuses existing artifacts rather than duplicating
- [ ] `GET /api/submissions/:submissionId` — returns current draft or confirmed state + workflow status
- [ ] Tests: workflow step sequencing with mocked crawl + extraction, idempotency verification, failure/retry scenarios

**Exit criteria:** Creating a submission triggers the full pipeline end-to-end. A draft with extracted fields, citations, and confidence scores is persisted and retrievable via API. Workflow failures retry gracefully.

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
