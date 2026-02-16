import { Hono } from 'hono';
import type { AppEnv } from '../types/app';
import { getDb } from '../db/client';
import { tenants, tenantMemberships, users } from '../db/schema';
import { createTenantRequestSchema } from '../types/api';
import { ValidationError, ConflictError } from '../lib/errors';
import { isUniqueViolation } from '../lib/utils/db';
import { eq } from 'drizzle-orm';

const tenantsRoute = new Hono<AppEnv>();

/**
 * Generate a URL-friendly slug from a name.
 * Converts to lowercase, replaces spaces/special chars with hyphens,
 * removes consecutive hyphens, and trims leading/trailing hyphens.
 *
 * NOTE: This logic is duplicated in client/src/pages/setup/OrganizationSetup.tsx
 * for client-side preview. Keep them in sync if modifying.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

tenantsRoute.post('/api/tenants', async (c) => {
  const body = await c.req.json();
  const parsed = createTenantRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { name, slug: providedSlug } = parsed.data;
  const slug = providedSlug ?? generateSlug(name);

  // Validate generated slug is not empty
  if (!slug) {
    throw new ValidationError('Unable to generate a valid slug from the provided name');
  }

  const userId = c.get('user').id;
  const db = getDb();

  // Look up the user record by the authenticated user ID
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new ValidationError('User not found');
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Create tenant
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name,
          slug,
        })
        .returning();

      // Create membership with admin role
      await tx.insert(tenantMemberships).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'admin',
      });

      return tenant;
    });

    return c.json(
      {
        tenant: {
          id: result.id,
          name: result.name,
          slug: result.slug,
          createdAt: result.createdAt.toISOString(),
        },
        membership: {
          role: 'admin' as const,
        },
      },
      201
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError('An organization with this slug already exists');
    }
    throw err;
  }
});

export default tenantsRoute;
