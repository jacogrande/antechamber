# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Antechamber is a schema-driven intake SaaS. Customers provide a website URL, the system crawls and extracts company info based on a custom schema, generates an auto-filled draft with citations, and exports confirmed data via webhooks/API. See `docs/mvp-prd.md` for the full PRD.

## Tech Stack

### Backend
- **Runtime:** Bun
- **Framework:** Hono (lightweight web framework)
- **Language:** TypeScript (strict mode) with Hono JSX (`jsxImportSource: "hono/jsx"`)
- **Deployment:** Vercel Functions (Bun runtime)
- **Database:** Postgres (Drizzle ORM)
- **Storage:** Vercel Blob for crawl artifacts
- **LLM:** Anthropic Claude for field extraction with citations

### Frontend (`client/`)
- **Framework:** React 18 + Vite
- **UI Components:** shadcn/ui (Radix UI primitives + Tailwind CSS)
- **State:** TanStack Query for server state
- **Forms:** React Hook Form + Zod
- **Auth:** Supabase Auth

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

**Planned workflow** (`generate_antechamber_draft`): validate input → discover pages → fetch pages → classify pages → extract fields (LLM) → validate/normalize → persist draft → notify

**Key data types** (defined in PRD §7): `FieldDefinition`, `SchemaVersion`, `Citation`, `ExtractedFieldValue`, `SubmissionDraft`, `SubmissionConfirmed`

## Key Design Constraints

- Every extracted field must include citations — no unsourced claims (status: `"unknown"` if no evidence)
- Multi-tenant: all resources scoped by `TenantId`
- Crawling must respect `robots.txt`, rate-limit requests, and store raw HTML snapshots
- Vercel Workflow steps must be idempotent (re-running won't duplicate artifacts)
- Webhooks are signed and delivered at-least-once
