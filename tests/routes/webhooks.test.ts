import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../src/middleware/error-handler';
import { ValidationError, NotFoundError } from '../../src/lib/errors';
import { registerWebhookRequestSchema } from '../../src/types/api';
import { generateWebhookSecret } from '../../src/lib/webhooks';

/**
 * Webhook route tests.
 * Stub-based: builds a minimal Hono app that replicates route behavior.
 */

interface StoredWebhook {
  id: string;
  tenantId: string;
  endpointUrl: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuditLogEntry {
  event: string;
  resourceId: string;
}

function createWebhooksTestApp(options: {
  webhooks?: StoredWebhook[];
  tenantId?: string;
  userId?: string;
} = {}) {
  const tenantId = options.tenantId ?? 'tenant-1';
  const userId = options.userId ?? 'user-1';
  const storedWebhooks: StoredWebhook[] = options.webhooks ? [...options.webhooks] : [];
  const auditLogs: AuditLogEntry[] = [];
  let nextWebhookNum = storedWebhooks.length + 1;

  const makeWebhookUuid = (n: number) => `50000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

  const app = new Hono();
  app.onError(errorHandler);

  // POST /api/webhooks
  app.post('/api/webhooks', async (c) => {
    const body = await c.req.json();
    const parsed = registerWebhookRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const secret = generateWebhookSecret();
    const webhook: StoredWebhook = {
      id: makeWebhookUuid(nextWebhookNum++),
      tenantId,
      endpointUrl: parsed.data.endpointUrl,
      secret,
      events: parsed.data.events,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storedWebhooks.push(webhook);

    auditLogs.push({ event: 'webhook.registered', resourceId: webhook.id });

    return c.json(
      {
        id: webhook.id,
        secret,
        endpointUrl: webhook.endpointUrl,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
      201,
    );
  });

  // GET /api/webhooks
  app.get('/api/webhooks', async (c) => {
    const results = storedWebhooks.filter(
      (w) => w.tenantId === tenantId && w.isActive,
    );

    return c.json({
      webhooks: results.map((w) => ({
        id: w.id,
        endpointUrl: w.endpointUrl,
        events: w.events,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
    });
  });

  // DELETE /api/webhooks/:webhookId
  app.delete('/api/webhooks/:webhookId', async (c) => {
    const webhookId = c.req.param('webhookId');

    // Validate UUID format (simple check)
    if (!webhookId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new ValidationError('Invalid webhook ID format');
    }

    const webhook = storedWebhooks.find(
      (w) => w.id === webhookId && w.tenantId === tenantId,
    );

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    webhook.isActive = false;
    webhook.updatedAt = new Date().toISOString();

    return c.body(null, 204);
  });

  return { app, storedWebhooks, auditLogs };
}

// --- Helpers ---

function postWebhook(app: Hono, body: unknown) {
  return app.request('/api/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getWebhooks(app: Hono) {
  return app.request('/api/webhooks');
}

function deleteWebhook(app: Hono, webhookId: string) {
  return app.request(`/api/webhooks/${webhookId}`, { method: 'DELETE' });
}

// =====================
// POST /api/webhooks
// =====================

describe('POST /api/webhooks', () => {
  it('registers webhook → 201 with secret', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      endpointUrl: 'https://example.com/webhook',
      events: ['submission.confirmed'],
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.secret).toBeDefined();
    expect(body.secret).toHaveLength(64);
    expect(body.endpointUrl).toBe('https://example.com/webhook');
    expect(body.events).toEqual(['submission.confirmed']);
    expect(body.isActive).toBe(true);
  });

  it('rejects non-HTTPS URL → 400', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      endpointUrl: 'http://example.com/webhook',
      events: ['submission.confirmed'],
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid URL → 400', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      endpointUrl: 'not-a-url',
      events: ['submission.confirmed'],
    });

    expect(res.status).toBe(400);
  });

  it('rejects empty events array → 400', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      endpointUrl: 'https://example.com/webhook',
      events: [],
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid event type → 400', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      endpointUrl: 'https://example.com/webhook',
      events: ['invalid.event'],
    });

    expect(res.status).toBe(400);
  });

  it('rejects missing endpointUrl → 400', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      events: ['submission.confirmed'],
    });

    expect(res.status).toBe(400);
  });

  it('rejects missing events → 400', async () => {
    const { app } = createWebhooksTestApp();
    const res = await postWebhook(app, {
      endpointUrl: 'https://example.com/webhook',
    });

    expect(res.status).toBe(400);
  });

  it('logs webhook registration to audit', async () => {
    const { app, auditLogs } = createWebhooksTestApp();
    await postWebhook(app, {
      endpointUrl: 'https://example.com/webhook',
      events: ['submission.confirmed'],
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].event).toBe('webhook.registered');
  });
});

// =====================
// GET /api/webhooks
// =====================

describe('GET /api/webhooks', () => {
  it('returns empty array when no webhooks', async () => {
    const { app } = createWebhooksTestApp();
    const res = await getWebhooks(app);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhooks).toEqual([]);
  });

  it('returns active webhooks for tenant', async () => {
    const existingWebhook: StoredWebhook = {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      endpointUrl: 'https://example.com/webhook',
      secret: 'secret-123',
      events: ['submission.confirmed'],
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createWebhooksTestApp({ webhooks: [existingWebhook] });

    const res = await getWebhooks(app);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhooks).toHaveLength(1);
    expect(body.webhooks[0].id).toBe(existingWebhook.id);
    expect(body.webhooks[0].endpointUrl).toBe('https://example.com/webhook');
  });

  it('omits secrets from response', async () => {
    const existingWebhook: StoredWebhook = {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      endpointUrl: 'https://example.com/webhook',
      secret: 'secret-123',
      events: ['submission.confirmed'],
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createWebhooksTestApp({ webhooks: [existingWebhook] });

    const res = await getWebhooks(app);
    const body = await res.json();
    expect(body.webhooks[0].secret).toBeUndefined();
  });

  it('does not return inactive webhooks', async () => {
    const inactiveWebhook: StoredWebhook = {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      endpointUrl: 'https://example.com/webhook',
      secret: 'secret-123',
      events: ['submission.confirmed'],
      isActive: false,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createWebhooksTestApp({ webhooks: [inactiveWebhook] });

    const res = await getWebhooks(app);
    const body = await res.json();
    expect(body.webhooks).toHaveLength(0);
  });

  it('does not return webhooks from other tenants', async () => {
    const otherTenantWebhook: StoredWebhook = {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: 'other-tenant',
      endpointUrl: 'https://example.com/webhook',
      secret: 'secret-123',
      events: ['submission.confirmed'],
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createWebhooksTestApp({ webhooks: [otherTenantWebhook] });

    const res = await getWebhooks(app);
    const body = await res.json();
    expect(body.webhooks).toHaveLength(0);
  });
});

// =====================
// DELETE /api/webhooks/:webhookId
// =====================

describe('DELETE /api/webhooks/:webhookId', () => {
  it('soft deletes webhook → 204', async () => {
    const existingWebhook: StoredWebhook = {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: 'tenant-1',
      endpointUrl: 'https://example.com/webhook',
      secret: 'secret-123',
      events: ['submission.confirmed'],
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const { app, storedWebhooks } = createWebhooksTestApp({ webhooks: [existingWebhook] });

    const res = await deleteWebhook(app, existingWebhook.id);

    expect(res.status).toBe(204);
    expect(storedWebhooks[0].isActive).toBe(false);
  });

  it('returns 404 for nonexistent webhook', async () => {
    const { app } = createWebhooksTestApp();
    const res = await deleteWebhook(app, '50000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid webhook ID format', async () => {
    const { app } = createWebhooksTestApp();
    const res = await deleteWebhook(app, 'not-a-uuid');

    expect(res.status).toBe(400);
  });

  it('returns 404 for webhook in different tenant', async () => {
    const otherTenantWebhook: StoredWebhook = {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: 'other-tenant',
      endpointUrl: 'https://example.com/webhook',
      secret: 'secret-123',
      events: ['submission.confirmed'],
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const { app } = createWebhooksTestApp({ webhooks: [otherTenantWebhook] });

    const res = await deleteWebhook(app, otherTenantWebhook.id);

    expect(res.status).toBe(404);
  });
});
