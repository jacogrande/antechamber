import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { webhooks, webhookDeliveries } from '../db/schema';
import { registerWebhookRequestSchema } from '../types/api';
import { ValidationError, NotFoundError } from '../lib/errors';
import { generateWebhookSecret, validateWebhookUrl } from '../lib/webhooks';
import { AuditService } from '../lib/audit';

export interface WebhooksRouteDeps {
  db?: Database;
  auditService?: AuditService;
}

export function createWebhooksRoute(depsOverride?: WebhooksRouteDeps) {
  const route = new Hono<AppEnv>();

  // Create audit service once per route instance
  let _auditService: AuditService | undefined;

  const getAuditService = (db: Database): AuditService => {
    if (depsOverride?.auditService) return depsOverride.auditService;
    if (!_auditService) _auditService = new AuditService(db);
    return _auditService;
  };

  // POST /api/webhooks - Register a new webhook
  route.post('/api/webhooks', async (c) => {
    const body = await c.req.json();
    const parsed = registerWebhookRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const tenantId = c.get('tenantId');
    const userId = c.get('user').id;
    const db = depsOverride?.db ?? getDb();

    // Validate webhook URL (SSRF prevention)
    await validateWebhookUrl(parsed.data.endpointUrl);

    // Generate a secure secret for webhook signing
    const secret = generateWebhookSecret();

    const [webhook] = await db
      .insert(webhooks)
      .values({
        tenantId,
        endpointUrl: parsed.data.endpointUrl,
        secret,
        events: parsed.data.events,
        isActive: true,
      })
      .returning();

    // Audit log
    const audit = getAuditService(db);
    await audit.logWebhookRegistered(
      tenantId,
      webhook.id,
      userId,
      parsed.data.endpointUrl,
      parsed.data.events,
    );

    return c.json(
      {
        id: webhook.id,
        secret,
        endpointUrl: webhook.endpointUrl,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt?.toISOString(),
      },
      201,
    );
  });

  // GET /api/webhooks - List all webhooks for tenant
  route.get('/api/webhooks', async (c) => {
    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    const results = await db
      .select({
        id: webhooks.id,
        endpointUrl: webhooks.endpointUrl,
        events: webhooks.events,
        isActive: webhooks.isActive,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.isActive, true)));

    return c.json({
      webhooks: results.map((w) => ({
        id: w.id,
        endpointUrl: w.endpointUrl,
        events: w.events,
        isActive: w.isActive,
        createdAt: w.createdAt?.toISOString(),
      })),
    });
  });

  // DELETE /api/webhooks/:webhookId - Deactivate a webhook
  route.delete('/api/webhooks/:webhookId', async (c) => {
    const webhookId = c.req.param('webhookId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(webhookId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid webhook ID format');
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    // Verify webhook exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.tenantId, tenantId)));

    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    // Soft delete by setting isActive to false
    await db
      .update(webhooks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(webhooks.id, webhookId));

    return c.body(null, 204);
  });

  // GET /api/webhooks/:webhookId/deliveries - List delivery history
  route.get('/api/webhooks/:webhookId/deliveries', async (c) => {
    const webhookId = c.req.param('webhookId');

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(webhookId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid webhook ID format');
    }

    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    // Verify webhook exists and belongs to tenant
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.tenantId, tenantId)));

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const deliveries = await db
      .select({
        id: webhookDeliveries.id,
        webhookId: webhookDeliveries.webhookId,
        submissionId: webhookDeliveries.submissionId,
        event: webhookDeliveries.event,
        status: webhookDeliveries.status,
        attempts: webhookDeliveries.attempts,
        lastAttemptAt: webhookDeliveries.lastAttemptAt,
        lastError: webhookDeliveries.lastError,
        completedAt: webhookDeliveries.completedAt,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(50);

    return c.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        webhookId: d.webhookId,
        submissionId: d.submissionId,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
        lastError: d.lastError,
        completedAt: d.completedAt?.toISOString() ?? null,
        createdAt: d.createdAt?.toISOString(),
      })),
    });
  });

  return route;
}

const webhooksRoute = createWebhooksRoute();
export default webhooksRoute;
