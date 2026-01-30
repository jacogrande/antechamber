# Session Handover — 2026-01-30

## Work Completed This Session

### Workflow Observability & Debugging
Added comprehensive logging throughout the extraction pipeline:
- `[app-deps]` - Startup logging for workflow dependency initialization
- `[workflow]` - Step execution with timing, start/completion logs
- `[crawl]` - Pipeline progress (robots.txt, page discovery, fetching, extraction)
- `[fetch]` - Individual page fetch with status codes and timing
- `[extraction]` - LLM batch processing, confidence scoring
- `[llm]` - Per-page extraction with timing and field counts

### Submission Detail Page Fixes
- Fixed crash when viewing pending submissions (undefined `extractedFields`, `artifacts`, `workflowSteps`)
- Updated `SubmissionDetail` type to make workflow data optional
- Fixed API response shape mismatch between backend and frontend
- Added `extractedFields` transformation with proper field mapping (`key` → `fieldKey`, etc.)
- Added `artifacts` extraction from crawl step output
- Added `confidence` and `reason` fields to extracted field display

### Extraction Quality Improvements
- **Stricter LLM prompt**: Now requires direct evidence, defines confidence tiers, prohibits guessing
- **Evidence validation**: Post-extraction check that penalizes confidence when snippet doesn't contain value
- **Higher threshold**: Extractions below 50% confidence are now skipped entirely (was 20%)
- Updated tool schema to require `reason` for all extractions

### Field Editing Before Confirmation
- Added "Edit Fields" mode to submission detail page
- Inline field editing with type-appropriate inputs (text, number, checkbox, arrays)
- Visual feedback for edited rows (yellow highlight, "Edited" badge)
- Edits are sent with confirm request to backend
- Fixed `confirmSubmission` API to send required `confirmedBy` field

### AI SaaS Context Pack Templates
Created 5 new schema templates for AI assistant use cases:
1. **AI Assistant Context Pack** - Core customer context fields
2. **Brand Voice & Messaging** - Tone, personality, terminology
3. **Product Catalog Context** - Products, pricing, features
4. **Compliance & Security Profile** - Certifications, guardrails data
5. **Support Context Pack** - Help channels, documentation URLs

Added new `ai` category to schema template gallery.

### UI/UX Improvements
- Made Workflow Progress horizontal (full-width row) instead of column
- Added confidence indicator with color-coded progress bar
- Enhanced citations display with inline snippets (not just URLs)
- Added reason tooltips for extraction explanations

## Current State

**Branch**: `main`
**Uncommitted changes**: Yes - significant changes across frontend and backend

### Modified Files (Frontend - apps/admin)
- `src/components/schemas/SchemaTemplateGallery.tsx` - Added 'ai' category
- `src/components/submissions/ExtractedFieldsTable.tsx` - Editing, confidence, citations
- `src/components/submissions/WorkflowProgress.tsx` - Horizontal layout
- `src/hooks/useSubmissions.ts` - Updated confirm mutation signature
- `src/lib/api/submissions.ts` - Added FieldEdit types, confirm params
- `src/lib/example-schemas.ts` - Added 5 AI context pack templates
- `src/pages/submissions/SubmissionDetail.tsx` - Field editing, layout changes
- `src/types/submission.ts` - Added confidence, reason, optional fields

### Modified Files (Backend - src/)
- `src/app-deps.ts` - Added startup logging
- `src/lib/crawl/fetcher.ts` - Per-fetch logging
- `src/lib/crawl/pipeline.ts` - Pipeline stage logging
- `src/lib/extraction/facade.ts` - Batch processing logs
- `src/lib/extraction/page-extractor.ts` - LLM timing logs
- `src/lib/extraction/parser.ts` - Evidence validation, confidence penalty
- `src/lib/extraction/prompt.ts` - Stricter instructions, required reason
- `src/lib/workflow/runner.ts` - Step execution logging
- `src/lib/workflow/steps.ts` - Per-step progress logs
- `src/routes/submissions.ts` - Fixed response shape, added artifacts

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Confidence threshold | 50% minimum | User reported 40% confidence fields still showing - too permissive |
| Evidence validation | Penalize if value not in snippet | LLM was guessing company_size from contact info - need verification |
| Field editing | Inline inputs in table | Simpler than modal, shows context while editing |
| Workflow layout | Horizontal full-width | Takes less vertical space, shows pipeline flow better |
| AI templates | 5 focused packs | Based on positioning doc - each serves specific AI assistant need |

## Blockers & Open Questions

### None Critical
All features implemented and building successfully.

### Minor Issues
- Console has some debug logs that could be removed or made conditional
- Field editing for `enum` types just uses text input (would need schema context for dropdown)

## Next Steps

### 1. Commit All Changes
```bash
git add -A
git commit -m "feat: add workflow logging, field editing, AI context templates

- Add comprehensive logging throughout extraction pipeline
- Fix submission detail page for pending submissions
- Add evidence validation to penalize unsupported extractions
- Increase confidence threshold to 50%
- Add field editing UI before confirmation
- Create 5 AI SaaS context pack templates
- Make workflow progress horizontal layout"
```

### 2. Test the Changes
- Create a new submission and watch logs
- Verify low-confidence extractions are filtered
- Test field editing flow before confirmation
- Browse AI context pack templates

### 3. Consider Platform Features (from positioning doc)
Priority features to implement:
1. **Strict Mode** - Schema-level toggle for evidence-only output
2. **RAG Export** - `/export/rag` endpoint with chunked docs
3. **Guardrails Pack** - `/guardrails` endpoint with approved/unverified claims
4. **Minimal Follow-ups** - Generate questions only for missing fields

### 4. Remove Debug Logging (Optional)
Make logging conditional on `NODE_ENV=development` or add log level config.

## Important Files

### Extraction Quality
- `src/lib/extraction/parser.ts` - Evidence validation logic
- `src/lib/extraction/prompt.ts` - LLM instructions

### Submission Detail
- `apps/admin/src/pages/submissions/SubmissionDetail.tsx` - Main page
- `apps/admin/src/components/submissions/ExtractedFieldsTable.tsx` - Field display/editing
- `src/routes/submissions.ts` - API response transformation

### AI Templates
- `apps/admin/src/lib/example-schemas.ts` - All templates including AI packs

## Commands to Resume

```bash
cd /Users/jackson/Code/projects/onboarding

# Check status
git status

# Type check both projects
bun run typecheck
cd apps/admin && bun run build && cd ..

# Start both servers (two terminals)
# Terminal 1 - Backend:
bun run dev

# Terminal 2 - Frontend:
cd apps/admin && bun run dev

# Test a submission
# 1. Go to http://localhost:5173
# 2. Create schema from AI template
# 3. Create submission with a company URL
# 4. Watch backend logs for extraction progress
# 5. View submission detail, test field editing

# Commit when ready
git add -A
git commit -m "feat: workflow observability, field editing, AI context templates"
```
