# Phase 5 — Workflow Orchestration Decisions

This document records the design decisions and review findings addressed during Phase 5 implementation.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workflow engine | Local step-based runner (not Vercel Workflow SDK) | No `@vercel/workflow` installed; local runner is testable and portable. Design mirrors WDK semantics for future migration. |
| Async model | Fire-and-forget promise, return `202 Accepted` | Crawl+extract can take 30-60s; can't block the HTTP response. Tests use stubs instead of awaiting. |
| Step granularity | 4 coarse steps: `validate` → `crawl` → `extract` → `persist_draft` | Reuses existing `runCrawlPipeline` and `extractAndSynthesize` as-is. Avoids splitting tested modules. |
| Idempotency | Step outputs stored in `workflow_runs.steps` JSONB; re-run skips completed steps | Matches PRD requirement: "re-triggering reuses existing artifacts." |
| Retry | Per-step exponential backoff; `AppError` with `statusCode < 500` is non-retryable | Different steps have different failure profiles (network vs LLM vs DB). |
| Route DI | Submissions route receives `WorkflowDeps` via factory | Enables stub-based Hono tests matching existing `schemas.test.ts` pattern. |

## Review Findings Addressed

### High Priority

**H1. `null as any` casts in production path**
- **Problem**: Production workflow path cast `null as any` for `storage` and `llmClient`, causing runtime crashes.
- **Solution**: Changed to graceful degradation — if deps aren't configured, log a warning and skip workflow auto-launch. The workflow run is created with `status=pending` for later manual retry. This allows the API to function during development while deps are being wired.

**H2. Duplicated fire-and-forget code**
- **Problem**: Two nearly-identical if/else branches with fragile branching condition.
- **Solution**: Consolidated to a single code path that checks `storage && llmClient` before launching. The dep resolution uses `depsOverride?.db ?? getDb()` consistently.

**H3. Unused import: `max` in steps.ts**
- **Problem**: `max` imported from drizzle-orm but never used.
- **Solution**: Removed the unused import.

### Medium Priority

**M1. Submission + workflow run creation not in a transaction**
- **Problem**: Two separate DB inserts could leave orphaned data on crash.
- **Solution**: Wrapped both inserts in `db.transaction()` to ensure atomicity. If either fails, both are rolled back.

**M2. `withTimeout` does not cancel underlying work**
- **Problem**: Timed-out promises continue running, consuming resources.
- **Decision**: Documented as a known limitation. Future enhancement could add `AbortSignal` support to crawl and extraction modules. Current behavior is acceptable because: (1) timeout is a backstop, not the normal path, (2) failed workflows are marked failed in DB regardless.

**M3. No UUID validation on GET `:submissionId`**
- **Problem**: Invalid UUIDs caused Postgres errors instead of clean 400s.
- **Solution**: Added `z.string().uuid().safeParse()` validation before DB query. Returns `ValidationError` for malformed IDs.

**M4. `ctx.fetchFn` may be undefined**
- **Decision**: Left as-is. The `runCrawlPipeline` function defaults to native `fetch` when `fetchFn` is undefined. The implicit passthrough is acceptable and matches the optional nature of the dep.

### Low Priority

**L1. Unused `beforeEach` import in runner.test.ts**
- **Solution**: Removed the unused import.

**L2. Unused `capturedArgs` variable in steps.test.ts**
- **Solution**: Removed the unused variable declaration.

**L3. Validate step test accepts DNS failures**
- **Decision**: Left as-is with try/catch. The test verifies DB lookup logic works correctly regardless of network environment. DNS resolution behavior is tested separately in `url.test.ts`. The try/catch ensures the test doesn't flake in environments without network access.

**L4. DB status update race condition in runner**
- **Decision**: Documented as acceptable for current single-runner design. No row-level locking (`FOR UPDATE`) is used. If concurrent runners become a concern during WDK migration, we'll add pessimistic locking then.

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `runner.test.ts` | 11 | Sequencing, retry, idempotency, timeout, non-retryable errors, attempt tracking |
| `steps.test.ts` | 7 | validate/crawl/extract/persist_draft with mocked DB + LLM |
| `submissions.test.ts` | 11 | POST validation, 202 response, GET with workflow status, UUID validation, tenant scoping |

**Total**: 29 new tests (345 total in suite)

## Files Changed

### New Files
- `src/lib/workflow/types.ts` — Status unions, StepRecord, RetryPolicy, StepDefinition, WorkflowDeps, WorkflowContext
- `src/lib/workflow/runner.ts` — WorkflowRunner class with retry, timeout, idempotency
- `src/lib/workflow/steps.ts` — 4 step definitions + assembled workflow
- `src/lib/workflow/index.ts` — Barrel exports
- `src/routes/submissions.ts` — POST (202) + GET endpoints with DI factory
- `tests/lib/workflow/runner.test.ts`
- `tests/lib/workflow/steps.test.ts`
- `tests/routes/submissions.test.ts`

### Modified Files
- `src/db/schema.ts` — Added `submissions` + `workflowRuns` tables, 2 pgEnums
- `src/types/api.ts` — Added `createSubmissionRequestSchema`
- `src/env.ts` — Added optional `ANTHROPIC_API_KEY`
- `src/index.ts` — Registered submissions route

## Production Deployment Notes

Before deploying to production, wire the following in `createSubmissionsRoute()`:

```typescript
// In src/index.ts or app setup:
import { createSubmissionsRoute } from './routes/submissions';
import { createAnthropicClient } from './lib/extraction/llm-client';
import { S3StorageClient } from './lib/storage'; // TODO: implement

const submissionsRoute = createSubmissionsRoute({
  storage: new S3StorageClient(env.S3_BUCKET),
  llmClient: createAnthropicClient(env.ANTHROPIC_API_KEY),
});
app.route('/', submissionsRoute);
```

Without these deps, submissions will be created but workflows will not auto-launch (they'll remain in `pending` status with a console warning).
