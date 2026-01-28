import { z } from 'zod';

// --- Auth ---

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
  }),
  tenants: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      role: z.enum(['admin', 'editor', 'viewer']),
    }),
  ),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const logoutResponseSchema = z.object({
  success: z.boolean(),
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// --- Error ---

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// --- Health ---

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
