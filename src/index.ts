import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { requireRole } from './middleware/rbac';
import health from './routes/health';
import auth from './routes/auth';
import schemas from './routes/schemas';
import submissions from './routes/submissions';
import webhooksRoute from './routes/webhooks';
import cronRoute from './routes/cron';
import statsRoute from './routes/stats';

export type AppEnv = {
  Variables: {
    user: { id: string; email: string };
    tenantId: string;
    tenantRole: 'admin' | 'editor' | 'viewer';
    jwtPayload: Record<string, unknown>;
  };
};

const app = new Hono<AppEnv>();

// Global error handler
app.onError(errorHandler);

// Public routes (no auth required)
app.route('/', health);

// Cron routes (use their own auth via CRON_SECRET)
app.route('/', cronRoute);

// Auth middleware for /api/* — skip login and cron
app.use('/api/*', async (c, next) => {
  // Skip auth for login endpoint
  if (c.req.path === '/api/auth/login' && c.req.method === 'POST') {
    return next();
  }
  // Skip auth for cron endpoints (they use CRON_SECRET)
  if (c.req.path.startsWith('/api/cron/')) {
    return next();
  }
  return authMiddleware(c, next);
});

// Tenant middleware for tenant-scoped routes
app.use('/api/schemas/*', tenantMiddleware);
app.use('/api/submissions/*', tenantMiddleware);
app.use('/api/submissions', tenantMiddleware);
app.use('/api/webhooks/*', tenantMiddleware);
app.use('/api/stats', tenantMiddleware);
app.use('/api/tenant', tenantMiddleware);

// RBAC middleware for write operations
// Schemas: editor+ can create/modify schemas
app.post('/api/schemas', requireRole('editor'));
app.post('/api/schemas/:id/versions', requireRole('editor'));

// Webhooks: admin only for registration/deletion
app.post('/api/webhooks', requireRole('admin'));
app.delete('/api/webhooks/:id', requireRole('admin'));

// API routes (auth routes include both login and logout)
app.route('/', auth);
app.route('/', schemas);
app.route('/', submissions);
app.route('/', webhooksRoute);
app.route('/', statsRoute);

export default app;
