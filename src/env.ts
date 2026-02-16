import { z } from 'zod';
import { createLogger } from './lib/logger';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1), // Can contain [password] placeholder
  DB_PASSWORD: z.string().min(1).optional(), // Raw password, will be URL-encoded and substituted
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  PUBLIC_SESSION_SECRET: z.string().min(32).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  WEBHOOK_ENCRYPTION_KEY: z.string().length(64).regex(/^[0-9a-f]+$/, 'Must be a 64-char lowercase hex string').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    createLogger('env').error('Invalid environment variables', { fields: formatted });
    throw new Error(`Invalid environment variables: ${JSON.stringify(formatted)}`);
  }
  cachedEnv = result.data;
  return cachedEnv;
}

/** Reset cached env — useful in tests */
export function resetEnvCache(): void {
  cachedEnv = null;
}
