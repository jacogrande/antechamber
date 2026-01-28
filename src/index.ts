import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import health from './routes/health';
import auth from './routes/auth';
import schemas from './routes/schemas';
import submissions from './routes/submissions';

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

// Auth middleware for /api/* — skip login
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/auth/login' && c.req.method === 'POST') {
    return next();
  }
  return authMiddleware(c, next);
});

// Tenant middleware for tenant-scoped routes
app.use('/api/schemas/*', tenantMiddleware);
app.use('/api/submissions/*', tenantMiddleware);
app.use('/api/webhooks/*', tenantMiddleware);

// API routes (auth routes include both login and logout)
app.route('/', auth);
app.route('/', schemas);
app.route('/', submissions);

export default app;
