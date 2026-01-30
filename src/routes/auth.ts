import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { getEnv } from '../env';
import { getDb } from '../db/client';
import { users, tenantMemberships, tenants } from '../db/schema';
import { loginRequestSchema } from '../types/api';
import { ValidationError, UnauthorizedError } from '../lib/errors';

const auth = new Hono<AppEnv>();

auth.post('/api/auth/login', async (c) => {
  console.log('[AUTH] Login request received');
  const body = await c.req.json();
  console.log('[AUTH] Email:', body.email);
  const parsed = loginRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;
  const env = getEnv();
  console.log('[AUTH] Supabase URL:', env.SUPABASE_URL);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  console.log('[AUTH] Calling Supabase signInWithPassword...');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('[AUTH] Supabase response - error:', error?.message, 'hasSession:', !!data.session);

  if (error || !data.session) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Email should always exist for password-based auth
  const userEmail = data.user.email;
  if (!userEmail) {
    throw new UnauthorizedError('User account missing email');
  }

  const db = getDb();
  const authId = data.user.id;

  // Upsert user on first login
  const [existingUser] = await db.select().from(users).where(eq(users.authId, authId)).limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const [newUser] = await db
      .insert(users)
      .values({
        authId,
        email: userEmail,
        name: data.user.user_metadata?.name ?? null,
      })
      .returning();
    userId = newUser.id;
  }

  // Fetch tenant memberships with tenant details
  const memberships = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      role: tenantMemberships.role,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(eq(tenantMemberships.userId, userId));

  return c.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: userId,
      email: userEmail,
      name: data.user.user_metadata?.name ?? null,
    },
    tenants: memberships.map((m) => ({
      id: m.tenantId,
      name: m.tenantName,
      slug: m.tenantSlug,
      role: m.role,
    })),
  });
});

auth.post('/api/auth/logout', async (c) => {
  // Stateless JWT — client discards token. Server acknowledges.
  return c.json({ success: true });
});

export default auth;
