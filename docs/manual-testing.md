# Manual Testing Guide

This document describes how to manually test the onboarding intake system end-to-end.

## Prerequisites

### 1. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/onboarding

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# LLM (required for extraction)
ANTHROPIC_API_KEY=your-anthropic-key

# Cron jobs (optional, for webhook retries)
CRON_SECRET=your-cron-secret
```

### 2. Database Setup

Run migrations to create tables:

```bash
bun run db:migrate
```

### 3. Seed Data

You'll need test data in the database. Create via SQL or use the API:

```sql
-- Create a tenant
INSERT INTO tenants (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company', 'test-company');

-- Create a user (auth_id should match your Supabase user)
INSERT INTO users (id, auth_id, email, name)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'your-supabase-auth-id',
  'test@example.com',
  'Test User'
);

-- Create tenant membership
INSERT INTO tenant_memberships (tenant_id, user_id, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'admin'
);
```

### 4. Start the Server

```bash
bun run dev
```

The server runs on `http://localhost:3000` by default.

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/login` | No | Authenticate user |
| POST | `/api/auth/logout` | Yes | Log out (stateless) |
| POST | `/api/schemas` | Yes + Tenant | Create schema with fields |
| POST | `/api/schemas/:id/versions` | Yes + Tenant | Add new schema version |
| GET | `/api/schemas/:id/versions/:v` | Yes + Tenant | Get schema version |
| POST | `/api/submissions` | Yes + Tenant | Create submission (triggers workflow) |
| GET | `/api/submissions/:id` | Yes + Tenant | Get submission status/draft |
| POST | `/api/submissions/:id/confirm` | Yes + Tenant | Confirm with optional edits |
| GET | `/api/submissions/:id/artifacts` | Yes + Tenant | Get crawl artifacts |
| GET | `/api/submissions/:id/csv` | Yes + Tenant | Export as CSV |
| GET | `/api/submissions/:id/context-pack` | Yes + Tenant | Get assistant context pack |
| POST | `/api/webhooks` | Yes + Tenant | Register webhook endpoint |
| GET | `/api/webhooks` | Yes + Tenant | List webhooks |
| DELETE | `/api/webhooks/:id` | Yes + Tenant | Deactivate webhook |
| POST | `/api/cron/webhooks` | CRON_SECRET | Process pending webhook deliveries |

---

## Test Scenarios

### Scenario 1: Health Check

Verify the server is running.

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok"}
```

---

### Scenario 2: Authentication

#### 2.1 Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your-password"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "user": {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "test@example.com",
    "name": "Test User"
  },
  "tenants": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Test Company",
      "slug": "test-company",
      "role": "admin"
    }
  ]
}
```

Save the `accessToken` for subsequent requests.

#### 2.2 Set Up Environment Variables

```bash
export TOKEN="eyJ..."
export TENANT_ID="11111111-1111-1111-1111-111111111111"
```

---

### Scenario 3: Schema Management

#### 3.1 Create a Schema

```bash
curl -X POST http://localhost:3000/api/schemas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "name": "Company Profile",
    "fields": [
      {
        "key": "company_name",
        "label": "Company Name",
        "type": "string",
        "required": true,
        "instructions": "The official company name"
      },
      {
        "key": "industry",
        "label": "Industry",
        "type": "enum",
        "required": true,
        "instructions": "Primary industry the company operates in",
        "enumOptions": ["Technology", "Healthcare", "Finance", "Retail", "Manufacturing", "Other"]
      },
      {
        "key": "employee_count",
        "label": "Employee Count",
        "type": "number",
        "required": false,
        "instructions": "Approximate number of employees"
      },
      {
        "key": "headquarters",
        "label": "Headquarters Location",
        "type": "string",
        "required": false,
        "instructions": "City and country of headquarters",
        "sourceHints": ["about", "contact"]
      },
      {
        "key": "phone",
        "label": "Phone Number",
        "type": "string",
        "required": false,
        "instructions": "Main contact phone number",
        "sourceHints": ["contact"]
      },
      {
        "key": "description",
        "label": "Company Description",
        "type": "string",
        "required": false,
        "instructions": "Brief description of what the company does",
        "confidenceThreshold": 0.7
      }
    ]
  }'
```

**Expected Response (201):**
```json
{
  "schema": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "name": "Company Profile",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "version": {
    "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "schemaId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "version": 1,
    "fields": [...],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "createdBy": "22222222-2222-2222-2222-222222222222"
  }
}
```

Save the schema ID:
```bash
export SCHEMA_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

#### 3.2 Create a New Schema Version

```bash
curl -X POST "http://localhost:3000/api/schemas/$SCHEMA_ID/versions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "fields": [
      {
        "key": "company_name",
        "label": "Company Name",
        "type": "string",
        "required": true,
        "instructions": "The official registered company name"
      },
      {
        "key": "website",
        "label": "Website URL",
        "type": "string",
        "required": true,
        "instructions": "Primary website URL"
      }
    ]
  }'
```

#### 3.3 Get a Schema Version

```bash
curl "http://localhost:3000/api/schemas/$SCHEMA_ID/versions/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

---

### Scenario 4: Submission Workflow (Full E2E)

This is the core workflow: submit a URL, let the system crawl and extract, review, then confirm.

#### 4.1 Create a Submission

```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "schemaId": "'$SCHEMA_ID'",
    "websiteUrl": "https://example.com",
    "customerMeta": {
      "source": "manual-test"
    }
  }'
```

**Expected Response (202):**
```json
{
  "submissionId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "workflowRunId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
  "status": "pending"
}
```

Save the submission ID:
```bash
export SUBMISSION_ID="cccccccc-cccc-cccc-cccc-cccccccccccc"
```

#### 4.2 Poll for Workflow Completion

The workflow runs asynchronously. Poll until status changes from `pending`:

```bash
curl "http://localhost:3000/api/submissions/$SUBMISSION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

**Status Progression:**
- `pending` - Workflow queued or starting
- `draft` - Extraction complete, ready for review
- `confirmed` - User confirmed the submission
- `failed` - Workflow encountered an error

**Expected Response (when draft):**
```json
{
  "submission": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "status": "draft",
    "websiteUrl": "https://example.com",
    "fields": [
      {
        "key": "company_name",
        "value": "Example Inc",
        "confidence": 0.95,
        "status": "auto",
        "citations": [
          {
            "url": "https://example.com/about",
            "snippet": "Example Inc is a leading provider...",
            "pageTitle": "About Us"
          }
        ]
      },
      {
        "key": "industry",
        "value": null,
        "confidence": 0,
        "status": "unknown",
        "reason": "No evidence found"
      }
    ]
  },
  "workflowRun": {
    "status": "completed",
    "steps": [...]
  }
}
```

#### 4.3 Get Artifacts

View the raw crawl data:

```bash
curl "http://localhost:3000/api/submissions/$SUBMISSION_ID/artifacts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

#### 4.4 Confirm Submission (with optional edits)

```bash
curl -X POST "http://localhost:3000/api/submissions/$SUBMISSION_ID/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "confirmedBy": "customer",
    "edits": [
      {
        "fieldKey": "industry",
        "value": "Technology"
      },
      {
        "fieldKey": "employee_count",
        "value": 150
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "submission": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "status": "confirmed",
    "confirmedAt": "2024-01-15T12:00:00.000Z",
    "confirmedBy": "customer",
    "fields": [...]
  },
  "webhooksQueued": 1
}
```

---

### Scenario 5: Export Formats

#### 5.1 CSV Export

```bash
curl "http://localhost:3000/api/submissions/$SUBMISSION_ID/csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

**Expected Response:**
```csv
company_name,company_name_citation,industry,industry_citation,...
"Example Inc","https://example.com/about - \"Example Inc is...\"","Technology","",...
```

#### 5.2 Context Pack (for AI Assistants)

```bash
curl "http://localhost:3000/api/submissions/$SUBMISSION_ID/context-pack" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

**Expected Response:**
```json
{
  "context": {
    "submissionId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "websiteUrl": "https://example.com",
    "schemaId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "schemaVersion": 1,
    "fields": {
      "company_name": "Example Inc",
      "industry": "Technology"
    },
    "confirmedAt": "2024-01-15T12:00:00.000Z"
  },
  "sources": [
    {
      "url": "https://example.com/about",
      "title": "About Us",
      "retrievedAt": "2024-01-15T11:00:00.000Z",
      "snippets": ["Example Inc is a leading provider..."]
    }
  ],
  "metadata": {
    "generatedAt": "2024-01-15T12:05:00.000Z",
    "version": "1.0.0"
  }
}
```

---

### Scenario 6: Webhooks

#### 6.1 Register a Webhook

Use a service like [webhook.site](https://webhook.site) to get a test endpoint.

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "endpointUrl": "https://webhook.site/your-unique-id",
    "events": ["submission.confirmed"]
  }'
```

**Expected Response (201):**
```json
{
  "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  "secret": "whsec_...",
  "endpointUrl": "https://webhook.site/your-unique-id",
  "events": ["submission.confirmed"],
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Important:** Save the `secret` - you'll need it to verify webhook signatures.

#### 6.2 List Webhooks

```bash
curl http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

#### 6.3 Test Webhook Delivery

1. Register a webhook (as above)
2. Create and confirm a submission
3. Check webhook.site for the delivery

**Webhook Payload Format:**
```json
{
  "event": "submission.confirmed",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "submission": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "schemaId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "schemaVersion": 1,
    "websiteUrl": "https://example.com",
    "status": "confirmed",
    "confirmedAt": "2024-01-15T12:00:00.000Z",
    "confirmedBy": "customer",
    "fields": {...}
  },
  "artifacts": {
    "crawledPages": ["https://example.com", "https://example.com/about"],
    "htmlSnapshotKeys": [...]
  }
}
```

**Webhook Headers:**
- `X-Webhook-Signature` - HMAC-SHA256 signature for verification

#### 6.4 Trigger Webhook Retry (Cron)

If webhooks fail, they're queued for retry. Trigger manually:

```bash
curl -X POST http://localhost:3000/api/cron/webhooks \
  -H "Authorization: Bearer your-cron-secret"
```

#### 6.5 Delete a Webhook

```bash
curl -X DELETE "http://localhost:3000/api/webhooks/$WEBHOOK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

---

### Scenario 7: Error Cases

#### 7.1 Invalid Schema Field

```bash
curl -X POST http://localhost:3000/api/schemas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "name": "Invalid Schema",
    "fields": [
      {
        "key": "test",
        "label": "Test",
        "type": "enum",
        "required": true,
        "instructions": "Test field"
      }
    ]
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "formErrors": ["enumOptions must be a non-empty array when type is \"enum\""]
    }
  }
}
```

#### 7.2 Unauthorized Access

```bash
curl http://localhost:3000/api/schemas \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authorization header"
  }
}
```

#### 7.3 Wrong Tenant

Try accessing a resource from a different tenant:

```bash
curl "http://localhost:3000/api/schemas/wrong-schema-id/versions/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

**Expected Response (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Schema not found"
  }
}
```

#### 7.4 Invalid Webhook URL (SSRF Prevention)

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "endpointUrl": "https://localhost:8080/webhook",
    "events": ["submission.confirmed"]
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Webhook URL cannot target localhost or internal hosts"
  }
}
```

---

## Database Inspection

### Check Submission Status

```sql
SELECT id, status, website_url, confirmed_at
FROM submissions
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC;
```

### Check Workflow Run Progress

```sql
SELECT
  wr.id,
  wr.status,
  wr.workflow_name,
  wr.started_at,
  wr.completed_at,
  wr.error,
  jsonb_array_length(wr.steps) as step_count
FROM workflow_runs wr
JOIN submissions s ON wr.submission_id = s.id
WHERE s.tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY wr.created_at DESC;
```

### Check Webhook Deliveries

```sql
SELECT
  wd.id,
  wd.event,
  wd.status,
  wd.attempts,
  wd.last_error,
  wd.next_retry_at
FROM webhook_deliveries wd
JOIN webhooks w ON wd.webhook_id = w.id
WHERE w.tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY wd.created_at DESC;
```

### Check Audit Logs

```sql
SELECT
  event,
  resource_type,
  resource_id,
  details,
  created_at
FROM audit_logs
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Workflow Stuck in Pending

1. Check if `ANTHROPIC_API_KEY` is configured (required for extraction)
2. Check server logs for errors
3. Verify the website URL is accessible and allows crawling

### Webhook Not Delivered

1. Check `webhook_deliveries` table for status and errors
2. Ensure endpoint URL is HTTPS and publicly accessible
3. Trigger cron manually: `POST /api/cron/webhooks`
4. Check if webhook is active: `GET /api/webhooks`

### Authentication Failures

1. Verify Supabase credentials in `.env`
2. Check if user exists in both Supabase and local `users` table
3. Verify tenant membership exists

### SSRF Errors on Webhook Registration

The system blocks webhooks to:
- `localhost`, `127.0.0.1`, `::1`
- `.local`, `.internal`, `.localhost` domains
- Private IP ranges (10.x, 172.16-31.x, 192.168.x)

Use a public HTTPS endpoint for testing (e.g., webhook.site).

---

## Test Data Cleanup

```sql
-- Delete in order due to foreign keys
DELETE FROM audit_logs WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM webhook_deliveries WHERE webhook_id IN (
  SELECT id FROM webhooks WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
);
DELETE FROM webhooks WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM workflow_runs WHERE submission_id IN (
  SELECT id FROM submissions WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
);
DELETE FROM submissions WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM schema_versions WHERE schema_id IN (
  SELECT id FROM schemas WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
);
DELETE FROM schemas WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM tenant_memberships WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM tenants WHERE id = '11111111-1111-1111-1111-111111111111';
```
