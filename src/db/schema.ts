import { pgTable, uuid, text, timestamp, unique, pgEnum, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const tenantRoleEnum = pgEnum('tenant_role', ['admin', 'editor', 'viewer']);

export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'success', 'failed']);

export const auditEventEnum = pgEnum('audit_event', [
  'schema.created',
  'schema.version_created',
  'schema.deleted',
  'submission.created',
  'submission.confirmed',
  'submission.field_edited',
  'submission.retried',
  'webhook.registered',
  'webhook.delivery_succeeded',
  'webhook.delivery_failed',
  'publishable_key.created',
  'publishable_key.revoked',
]);

export const keyEnvironmentEnum = pgEnum('key_environment', ['live', 'test']);

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
  editHistory: jsonb('edit_history'),
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

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  endpointUrl: text('endpoint_url').notNull(),
  secret: text('secret').notNull(),
  events: text('events').array().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => webhooks.id),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id),
    event: text('event').notNull(),
    payload: jsonb('payload').notNull(),
    status: deliveryStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('webhook_deliveries_pending_retry_idx').on(t.status, t.nextRetryAt)],
);

export const publishableKeys = pgTable('publishable_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  environment: keyEnvironmentEnum('environment').notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  event: auditEventEnum('event').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_logs_tenant_created_idx').on(t.tenantId, t.createdAt),
  index('audit_logs_tenant_event_idx').on(t.tenantId, t.event),
]);
