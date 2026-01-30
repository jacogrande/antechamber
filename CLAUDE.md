# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tidings is a schema-driven intake SaaS. Customers provide a website URL, the system crawls and extracts company info based on a custom schema, generates an auto-filled draft with citations, and exports confirmed data via webhooks/API. See `docs/mvp-prd.md` for the full PRD.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono (lightweight web framework)
- **Language:** TypeScript (strict mode) with Hono JSX (`jsxImportSource: "hono/jsx"`)
- **Deployment:** Vercel Functions (Bun runtime) + Vercel Workflow (WDK) for durable pipelines
- **Storage (planned):** Postgres + S3/R2 for crawl artifacts
- **LLM (planned):** Pluggable (OpenAI/Anthropic) for field extraction with citations

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server with hot reload (localhost:3000)
bun test             # Run tests (bun's built-in test runner)
bun test path/to/file.test.ts  # Run a single test file
```

## Architecture

**Current state:** Early scaffold — single entry point at `src/index.ts` exporting a Hono app. Feature development follows the PRD in `docs/`.

**Planned API surface** (Hono routes defined in PRD §8):
- `/api/auth/*` — Authentication
- `/api/schemas/*` — Schema CRUD + versioning
- `/api/submissions/*` — Create submission → trigger workflow → review → confirm
- `/api/webhooks` — Register export endpoints
- `/api/submissions/:id/context-pack` — Assistant-ready context output

**Planned workflow** (`generate_tidings_draft`): validate input → discover pages → fetch pages → classify pages → extract fields (LLM) → validate/normalize → persist draft → notify

**Key data types** (defined in PRD §7): `FieldDefinition`, `SchemaVersion`, `Citation`, `ExtractedFieldValue`, `SubmissionDraft`, `SubmissionConfirmed`

## Key Design Constraints

- Every extracted field must include citations — no unsourced claims (status: `"unknown"` if no evidence)
- Multi-tenant: all resources scoped by `TenantId`
- Crawling must respect `robots.txt`, rate-limit requests, and store raw HTML snapshots
- Vercel Workflow steps must be idempotent (re-running won't duplicate artifacts)
- Webhooks are signed and delivered at-least-once
