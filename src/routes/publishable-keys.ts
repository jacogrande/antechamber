import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { publishableKeys } from '../db/schema';
import { ValidationError, NotFoundError } from '../lib/errors';
import {
  generatePublishableKey,
  hashPublishableKey,
  extractKeyPrefix,
} from '../lib/publishable-keys';
import { AuditService } from '../lib/audit';

export interface PublishableKeysRouteDeps {
  db?: Database;
  auditService?: AuditService;
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['live', 'test']),
});

export function createPublishableKeysRoute(depsOverride?: PublishableKeysRouteDeps) {
  const route = new Hono<AppEnv>();

  let _auditService: AuditService | undefined;

  const getAuditService = (db: Database): AuditService => {
    if (depsOverride?.auditService) return depsOverride.auditService;
    if (!_auditService) _auditService = new AuditService(db);
    return _auditService;
  };

  // GET /api/publishable-keys — List active keys for tenant
  route.get('/api/publishable-keys', async (c) => {
    const tenantId = c.get('tenantId');
    const db = depsOverride?.db ?? getDb();

    const results = await db
      .select({
        id: publishableKeys.id,
        name: publishableKeys.name,
        keyPrefix: publishableKeys.keyPrefix,
        environment: publishableKeys.environment,
        lastUsedAt: publishableKeys.lastUsedAt,
        createdAt: publishableKeys.createdAt,
      })
      .from(publishableKeys)
      .where(and(eq(publishableKeys.tenantId, tenantId), isNull(publishableKeys.revokedAt)));

    return c.json({
      keys: results.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        environment: k.environment,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    });
  });

  // POST /api/publishable-keys — Create a new publishable key
  route.post('/api/publishable-keys', async (c) => {
    const body = await c.req.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.flatten());
    }

    const tenantId = c.get('tenantId');
    const userId = c.get('user').id;
    const db = depsOverride?.db ?? getDb();

    const rawKey = generatePublishableKey(parsed.data.environment);
    const keyHash = hashPublishableKey(rawKey);
    const keyPrefix = extractKeyPrefix(rawKey);

    const [key] = await db
      .insert(publishableKeys)
      .values({
        tenantId,
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        environment: parsed.data.environment,
      })
      .returning();

    const audit = getAuditService(db);
    await audit.logPublishableKeyCreated(tenantId, key.id, userId, {
      name: parsed.data.name,
      environment: parsed.data.environment,
    });

    return c.json(
      {
        key: {
          id: key.id,
          name: key.name,
          rawKey,
          keyPrefix: key.keyPrefix,
          environment: key.environment,
          createdAt: key.createdAt.toISOString(),
        },
      },
      201,
    );
  });

  // DELETE /api/publishable-keys/:id — Soft revoke a key
  route.delete('/api/publishable-keys/:id', async (c) => {
    const keyId = c.req.param('id');

    const uuidResult = z.string().uuid().safeParse(keyId);
    if (!uuidResult.success) {
      throw new ValidationError('Invalid key ID format');
    }

    const tenantId = c.get('tenantId');
    const userId = c.get('user').id;
    const db = depsOverride?.db ?? getDb();

    const [existing] = await db
      .select()
      .from(publishableKeys)
      .where(and(eq(publishableKeys.id, keyId), eq(publishableKeys.tenantId, tenantId)));

    if (!existing) {
      throw new NotFoundError('Publishable key not found');
    }

    if (existing.revokedAt) {
      throw new NotFoundError('Publishable key not found');
    }

    await db
      .update(publishableKeys)
      .set({ revokedAt: new Date() })
      .where(eq(publishableKeys.id, keyId));

    const audit = getAuditService(db);
    await audit.logPublishableKeyRevoked(tenantId, keyId, userId);

    return c.body(null, 204);
  });

  return route;
}

const publishableKeysRoute = createPublishableKeysRoute();
export default publishableKeysRoute;
