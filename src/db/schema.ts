import { pgTable, uuid, text, timestamp, unique, pgEnum, integer, jsonb } from 'drizzle-orm/pg-core';

export const tenantRoleEnum = pgEnum('tenant_role', ['admin', 'editor', 'viewer']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: uuid('auth_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: tenantRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.tenantId, t.userId)],
);

// FKs use default "no action" on delete — schemas cannot be deleted while versions reference them,
// and tenants cannot be deleted while schemas reference them. This is intentional to prevent orphans.
export const schemas = pgTable(
  'schemas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.tenantId, t.name)],
);

export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'draft',
  'confirmed',
  'failed',
]);

export const workflowStatusEnum = pgEnum('workflow_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  schemaId: uuid('schema_id')
    .notNull()
    .references(() => schemas.id),
  schemaVersion: integer('schema_version').notNull(),
  websiteUrl: text('website_url').notNull(),
  status: submissionStatusEnum('status').notNull().default('pending'),
  fields: jsonb('fields'),
  customerMeta: jsonb('customer_meta'),
  confirmedBy: text('confirmed_by'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id),
  workflowName: text('workflow_name').notNull(),
  status: workflowStatusEnum('status').notNull().default('pending'),
  steps: jsonb('steps').notNull().default([]),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const schemaVersions = pgTable(
  'schema_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schemaId: uuid('schema_id')
      .notNull()
      .references(() => schemas.id),
    version: integer('version').notNull(),
    // Stores FieldDefinition[] (see src/types/api.ts fieldDefinitionSchema).
    // Each element has: key, label, type, required, instructions, and optional
    // enumOptions, validation, confidenceThreshold, sourceHints.
    fields: jsonb('fields').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [unique().on(t.schemaId, t.version)],
);
