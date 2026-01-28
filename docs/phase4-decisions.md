# Phase 4 Review Findings — Decisions

This document records the rationale for each fix applied from the Phase 4 extraction module code review.

## High Priority

### H1 — Bounded Concurrency (facade.ts)

**Problem:** `extractAndSynthesize` used `Promise.all(pages.map(...))`, sending all pages to the LLM simultaneously. For large crawls this could spike memory and hit API rate limits.

**Decision:** Batch chunking by `extractionConcurrency` (default: 5). Pages are split into fixed-size chunks and each chunk is processed with `Promise.all` before moving to the next. A semaphore was considered but rejected — LLM calls don't need inter-request delays like the crawl module does, so simple chunking is sufficient.

**Config:** `ExtractionConfig.extractionConcurrency` (default: 5).

### H2 — Corroboration Confidence (synthesis.ts)

**Problem:** Confidence for multi-source values was computed as an average: `sum / count`. This penalizes corroboration — three pages agreeing at 0.9 each produces 0.9, same as a single source.

**Decision:** Replace averaging with `min(1, maxConfidence + corroborationBoost * (count - 1))`. Default `corroborationBoost: 0.1`. This rewards multi-page agreement without exceeding 1.0.

Examples:
- 1 source at 0.5 -> 0.5 (unchanged)
- 3 sources at 0.5 -> min(1, 0.5 + 0.1*2) = 0.7
- 2 sources at 0.9 -> min(1, 0.9 + 0.1*1) = 1.0

Single-source results are unaffected (boost * 0 = 0), so existing tests remain valid.

**Config:** `ExtractionConfig.corroborationBoost` (default: 0.1).

### H3 — chat() Throws on Missing Text (llm-client.ts)

**Problem:** `chat()` returned an empty string when the API response lacked a text block. This could silently produce wrong results downstream.

**Decision:** Throw `Error('LLM response did not contain a text block')`, matching the throw-on-missing behavior already used in `chatWithTools`. Production code only uses `chatWithTools`; `chat()` is for future use. Failing loudly prevents silent bugs.

## Medium Priority

### M4 — Configurable Constants (prompt.ts, page-extractor.ts, types.ts)

**Problem:** `MAX_BODY_CHARS` (12000) and `MIN_WORD_COUNT` (10) were hardcoded module-level constants with no way to override them.

**Decision:** Move both into `ExtractionConfig` as `maxBodyChars` (default: 12000) and `minWordCount` (default: 10). `buildUserMessage` gains an optional third parameter `options?: { maxBodyChars?: number }`. `extractFieldsFromPage` reads both values from the spread config and passes `maxBodyChars` through to `buildUserMessage`.

### M5 — Full Regex Escaping (normalize.ts)

**Problem:** Company suffix matching used `s.replace(/\./g, '\\.')` which only escaped dots. Suffixes like `S.A.` or `P.C.` are safe today, but any future suffix with `(`, `+`, `*`, etc. would break.

**Decision:** Add an `escapeRegex(str)` helper that escapes all regex special characters (`[.*+?^${}()|[\]\\]`). This replaces the dot-only escaping and future-proofs the suffix list.

### M6 — Defensive Bucket Lookup (synthesis.ts)

**Problem:** `synthesizeFields` used `buckets.get(field.key)!` with a non-null assertion. If `buildMergeBuckets` had a bug, this would produce a confusing `TypeError: Cannot read properties of undefined`.

**Decision:** Replace with an explicit null check that throws a descriptive error explaining this is an internal invariant violation.

### M7 — Eliminate Re-mock in Tests (llm-client.test.ts)

**Problem:** The `chatWithTools throws on missing tool_use block` test re-invoked `mock.module` mid-suite and re-imported the module. This is fragile and can cause ordering issues.

**Decision:** Single top-level mock with content-based triggers. The mock inspects the user message for sentinel strings (`__NO_TOOL_USE__`, `__NO_TEXT__`) and returns different responses accordingly. No re-mocking or re-importing needed.

## Low Priority

### L8 — Model String Dedup (types.ts, llm-client.ts)

**Problem:** The model string `'claude-sonnet-4-20250514'` was duplicated in `DEFAULT_EXTRACTION_CONFIG` and `createAnthropicClient`'s default parameter.

**Decision:** Export `DEFAULT_MODEL` from `types.ts`. Import and use it as the default parameter in `createAnthropicClient`. Also re-export from `index.ts` for consumers.

### L9 — Internal Export Marking (index.ts)

**Problem:** The barrel file exported internal modules (parser, prompt, normalize, etc.) without indicating they are not part of the public API.

**Decision:** Add a `// @internal` comment on the internal exports section. This is a documentation-only change — no runtime impact.

### L10 — Edge Confidence Tests (parser.test.ts)

**Problem:** No tests for boundary confidence values (exactly 0, exactly 1, just above 1, just below 0).

**Decision:** Add four boundary tests confirming: confidence 0 is preserved, confidence 1 is preserved, confidence 1.01 is clamped to 1, confidence -0.01 is clamped to 0.
