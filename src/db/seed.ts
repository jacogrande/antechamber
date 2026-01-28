import { getDb } from './client';
import { tenants, users, tenantMemberships, schemas, schemaVersions } from './schema';

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

export const TEST_SCHEMA = {
  id: '00000000-0000-0000-0000-000000010000',
  tenantId: TEST_TENANT.id,
  name: 'Company Onboarding',
};

export const TEST_SCHEMA_VERSION = {
  id: '00000000-0000-0000-0000-000000100000',
  schemaId: TEST_SCHEMA.id,
  version: 1,
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string' as const,
      required: true,
      instructions: 'Extract the official company name',
    },
  ],
  createdBy: TEST_USER.id,
};

export async function seed() {
  const db = getDb();

  await db.insert(tenants).values(TEST_TENANT).onConflictDoNothing();
  await db.insert(users).values(TEST_USER).onConflictDoNothing();
  await db.insert(tenantMemberships).values(TEST_MEMBERSHIP).onConflictDoNothing();
  await db.insert(schemas).values(TEST_SCHEMA).onConflictDoNothing();
  await db.insert(schemaVersions).values(TEST_SCHEMA_VERSION).onConflictDoNothing();
}

export async function clean() {
  const db = getDb();

  // Delete in reverse FK dependency order to avoid constraint violations
  await db.delete(schemaVersions);
  await db.delete(schemas);
  await db.delete(tenantMemberships);
  await db.delete(users);
  await db.delete(tenants);
}
