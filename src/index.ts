import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { requireRole } from './middleware/rbac';
import { ipRateLimit, tenantRateLimit } from './middleware/rate-limit';
import { publishableKeyMiddleware } from './middleware/publishable-key';
import health from './routes/health';
import auth from './routes/auth';
import tenantsRoute from './routes/tenants';
import schemas from './routes/schemas';
import submissions from './routes/submissions';
import webhooksRoute from './routes/webhooks';
import publishableKeysRoute from './routes/publishable-keys';
import publicSessionsRoute from './routes/public-sessions';
import statsRoute from './routes/stats';
import auditRoute from './routes/audit';
import { checkDbConnection } from './db/client';
import type { AppEnv } from './types/app';
import { createLogger } from './lib/logger';

const log = createLogger('request');

// Check database connection on startup
void checkDbConnection();

// Re-export for backwards compatibility
export type { AppEnv } from './types/app';

const app = new Hono<AppEnv>();

// Log every request (debug level to avoid high-volume noise in production)
app.use('*', async (c, next) => {
  log.debug('Incoming request', { method: c.req.method, path: c.req.path });
  await next();
});

// ---------------------------------------------------------------------------
// CORS — public routes (called from arbitrary customer websites)
// ---------------------------------------------------------------------------
app.use(
  '/public/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'X-Publishable-Key'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  })
);

// ---------------------------------------------------------------------------
// CORS — console/API routes
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://console.antechamber.dev',
  ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
];

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (origin && allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Rate limits — public routes
// ---------------------------------------------------------------------------
app.use('/public/*', ipRateLimit(60, 60_000));
app.post('/public/sessions', ipRateLimit(10, 60_000));

// ---------------------------------------------------------------------------
// Rate limits — API routes
// ---------------------------------------------------------------------------
app.use('/api/*', ipRateLimit(100, 60_000));
app.post('/api/auth/login', ipRateLimit(10, 60_000));

// Global error handler
app.onError(errorHandler);

// ---------------------------------------------------------------------------
// Publishable key middleware for public routes
// ---------------------------------------------------------------------------
app.use('/public/*', publishableKeyMiddleware);

// Public routes (no auth required)
app.route('/', health);
app.route('/', publicSessionsRoute);

// ---------------------------------------------------------------------------
// Auth middleware for /api/* — skip login
// ---------------------------------------------------------------------------
app.use('/api/*', async (c, next) => {
  // Skip auth for login endpoint
  if (c.req.path === '/api/auth/login' && c.req.method === 'POST') {
    return next();
  }
  return authMiddleware(c, next);
});

// Tenant middleware for tenant-scoped routes
app.use('/api/schemas/*', tenantMiddleware);
app.use('/api/submissions/*', tenantMiddleware);
app.use('/api/submissions', tenantMiddleware);
app.use('/api/webhooks/*', tenantMiddleware);
app.use('/api/publishable-keys*', tenantMiddleware);
app.use('/api/stats', tenantMiddleware);
app.use('/api/tenant', tenantMiddleware);
app.use('/api/audit-logs', tenantMiddleware);

// Tenant rate limits (after tenant middleware so tenantId is available)
app.post('/api/submissions', tenantRateLimit(20, 3_600_000));
app.post('/api/webhooks', tenantRateLimit(10, 3_600_000));

// RBAC middleware for write operations
// Schemas: editor+ can create/modify/delete schemas
app.post('/api/schemas', requireRole('editor'));
app.post('/api/schemas/:id/versions', requireRole('editor'));
app.delete('/api/schemas/:schemaId', requireRole('editor'));

// Submissions: editor+ can retry failed submissions
app.post('/api/submissions/:id/retry', requireRole('editor'));

// Webhooks: admin only for registration/deletion
app.post('/api/webhooks', requireRole('admin'));
app.delete('/api/webhooks/:id', requireRole('admin'));

// Publishable keys: admin only for creation/revocation
app.post('/api/publishable-keys', requireRole('admin'));
app.delete('/api/publishable-keys/:id', requireRole('admin'));

// API routes (auth routes include both login and logout)
app.route('/', auth);
app.route('/', tenantsRoute); // Requires auth but NOT tenant middleware
app.route('/', schemas);
app.route('/', submissions);
app.route('/', webhooksRoute);
app.route('/', publishableKeysRoute);
app.route('/', statsRoute);
app.route('/', auditRoute);

export default app;
