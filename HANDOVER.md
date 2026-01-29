# Session Handover — 2026-01-28

## Work Completed This Session

### Phase 5: Workflow Orchestration (Primary Focus)
- **Database tables**: Added `submissions` and `workflow_runs` tables with status enums
- **POST /api/submissions**: Returns 202 Accepted, creates submission + workflow run atomically, fires-and-forgets workflow execution
- **GET /api/submissions/:id**: Returns submission with workflow status, UUID validation
- **WorkflowRunner**: Sequential step execution, exponential backoff retry, per-step timeout, idempotency via completed step caching
- **4-step workflow**: `validate` → `crawl` → `extract` → `persist_draft`
- **29 new tests** for runner, steps, and routes

### Phase 3: Crawl Module (Committed with Phase 5)
- URL validation with SSRF protection (private IP detection)
- robots.txt fetcher/parser with disallow rule enforcement
- Sitemap discovery with fallback to heuristic paths
- Rate-limited HTML fetcher with configurable concurrency
- Text extraction (title, headings, meta, body text)
- Artifact persistence (gzipped HTML + extracted content)
- **68 new tests** for crawl module

### Review Fixes Applied
- Replaced `null as any` casts with graceful degradation (logs warning, skips workflow if deps missing)
- Deduplicated fire-and-forget code into single path
- Wrapped submission + workflow run inserts in `db.transaction()`
- Added UUID validation on GET `/api/submissions/:submissionId`
- Removed unused imports (`max`, `beforeEach`) and variables (`capturedArgs`)

## Current State

**Branch**: `main`
**Uncommitted changes**: None — all work committed
**Last commit**: `fef6c23 Add Phase 3 crawl module and Phase 5 workflow orchestration`

**Test suite**: 345 tests passing, 0 failures
**Type check**: Clean (`tsc --noEmit` passes)

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workflow engine | Local step-based runner | No `@vercel/workflow` installed; local runner is testable and portable. Design mirrors WDK semantics for future migration. |
| Missing deps handling | Graceful degradation | If storage/llmClient not configured, log warning and skip auto-launch. Workflow run stays `pending` for manual retry. |
| DB atomicity | Transaction for submission+run | Prevents orphaned submissions if server crashes between inserts |
| UUID validation | Zod on GET route | Clean 400 errors instead of Postgres errors for invalid IDs |
| Retry policy | Per-step, non-retryable for 4xx | Different steps have different failure profiles; client errors shouldn't retry |

See `docs/phase5-decisions.md` for full details.

## Blockers & Open Questions

### Production Dependencies Not Yet Wired
The workflow requires `storage` and `llmClient` deps to run. Currently:
- `storage`: `StorageClient` interface exists, stub implementation for tests. Need S3/R2 production client.
- `llmClient`: `createAnthropicClient()` exists in extraction module. Need to wire with `ANTHROPIC_API_KEY` from env.

Until wired, submissions are created but workflows stay in `pending` status with a console warning.

### Known Limitations
- `withTimeout` doesn't cancel underlying promises (step keeps running after timeout)
- No row-level locking on workflow status updates (acceptable for single-runner design)

## Next Steps

### 1. Wire Production Dependencies (Blocking)
```typescript
// In src/index.ts or app setup:
import { createSubmissionsRoute } from './routes/submissions';
import { createAnthropicClient } from './lib/extraction/llm-client';
// import { S3StorageClient } from './lib/storage'; // TODO: implement

const submissionsRoute = createSubmissionsRoute({
  storage: new S3StorageClient(env.S3_BUCKET),
  llmClient: createAnthropicClient(env.ANTHROPIC_API_KEY!),
});
```

### 2. Phase 6: Review, Export & Audit
Per `docs/mvp-sprint-plan.md`:
- `POST /api/submissions/:id/confirm` — customer edits + confirmation
- Customer review UI with citations
- Webhook system (register endpoints, signed delivery, retry)
- CSV export, context-pack endpoint
- Audit logging

### 3. Database Migration
Run `bun run db:generate` and `bun run db:migrate` to create the new tables in a real database.

## Important Files

### New This Session
- `src/lib/workflow/` — WorkflowRunner, step definitions, types
- `src/lib/crawl/` — URL validation, robots, sitemap, fetcher, extractor, artifacts
- `src/routes/submissions.ts` — POST/GET endpoints with DI factory
- `docs/phase5-decisions.md` — Design decisions and review findings
- `tests/lib/workflow/` — 18 runner + step tests
- `tests/lib/crawl/` — 68 crawl tests
- `tests/routes/submissions.test.ts` — 11 route tests

### Modified
- `src/db/schema.ts` — Added submissions + workflowRuns tables
- `src/types/api.ts` — Added createSubmissionRequestSchema
- `src/env.ts` — Added optional ANTHROPIC_API_KEY
- `src/index.ts` — Registered submissions route
- `docs/mvp-sprint-plan.md` — Checked off Phase 5 items
- `docs/mvp-prd.md` — Updated extraction approach documentation

## Commands to Resume

```bash
cd /Users/jackson/Code/projects/onboarding
git status
git log --oneline -5

# Run tests
bun test

# Type check
bun run typecheck

# Start dev server
bun run dev

# Next: implement S3StorageClient or start Phase 6
```
