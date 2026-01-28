import { getDb } from './client';
import { tenants, users, tenantMemberships } from './schema';

export const TEST_TENANT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Tenant',
  slug: 'test-tenant',
};

export const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000010',
  authId: '00000000-0000-0000-0000-000000000100',
  email: 'test@example.com',
  name: 'Test User',
};

export const TEST_MEMBERSHIP = {
  id: '00000000-0000-0000-0000-000000001000',
  tenantId: TEST_TENANT.id,
  userId: TEST_USER.id,
  role: 'admin' as const,
};

export async function seed() {
  const db = getDb();

  await db.insert(tenants).values(TEST_TENANT).onConflictDoNothing();
  await db.insert(users).values(TEST_USER).onConflictDoNothing();
  await db.insert(tenantMemberships).values(TEST_MEMBERSHIP).onConflictDoNothing();
}

export async function clean() {
  const db = getDb();

  await db.delete(tenantMemberships);
  await db.delete(users);
  await db.delete(tenants);
}
