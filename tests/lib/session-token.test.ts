import { describe, it, expect, beforeAll } from 'bun:test';
import { SignJWT } from 'jose';
import { signSessionToken, verifySessionToken } from '../../src/lib/session-token';
import { resetEnvCache } from '../../src/env';
import { UnauthorizedError } from '../../src/lib/errors';

// Set up environment variables for testing
beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = 'test-secret-key-with-at-least-32-characters-for-security';
  process.env.PUBLIC_SESSION_SECRET = 'public-test-secret-key-with-at-least-32-characters';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  resetEnvCache();
});

describe('signSessionToken', () => {
  it('should produce a valid JWT string', async () => {
    const submissionId = 'sub_123';
    const tenantId = 'tenant_456';

    const token = await signSessionToken(submissionId, tenantId);

    expect(token).toBeTypeOf('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
  });

  it('should include correct claims in the token', async () => {
    const submissionId = 'sub_123';
    const tenantId = 'tenant_456';

    const token = await signSessionToken(submissionId, tenantId);
    const result = await verifySessionToken(token);

    expect(result.submissionId).toBe(submissionId);
    expect(result.tenantId).toBe(tenantId);
  });
});

describe('verifySessionToken', () => {
  it('should return submissionId and tenantId for valid token', async () => {
    const submissionId = 'sub_123';
    const tenantId = 'tenant_456';
    const token = await signSessionToken(submissionId, tenantId);

    const result = await verifySessionToken(token);

    expect(result).toEqual({
      submissionId,
      tenantId,
    });
  });

  it('should successfully round-trip sign and verify with original values', async () => {
    const submissionId = 'submission_xyz_789';
    const tenantId = 'tenant_abc_123';

    const token = await signSessionToken(submissionId, tenantId);
    const result = await verifySessionToken(token);

    expect(result.submissionId).toBe(submissionId);
    expect(result.tenantId).toBe(tenantId);
  });

  it('should throw UnauthorizedError for expired token', async () => {
    const secret = new TextEncoder().encode('public-test-secret-key-with-at-least-32-characters');

    // Create a token that expired 1 hour ago
    const expiredToken = await new SignJWT({ tid: 'tenant_123', type: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('sub_123')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800) // 30 min ago
      .sign(secret);

    await expect(verifySessionToken(expiredToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(expiredToken)).rejects.toThrow('Invalid or expired session token');
  });

  it('should throw UnauthorizedError for token with wrong type claim', async () => {
    const secret = new TextEncoder().encode('public-test-secret-key-with-at-least-32-characters');

    const wrongTypeToken = await new SignJWT({ tid: 'tenant_123', type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('sub_123')
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(secret);

    await expect(verifySessionToken(wrongTypeToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(wrongTypeToken)).rejects.toThrow('Invalid token type');
  });

  it('should throw UnauthorizedError for missing type claim', async () => {
    const secret = new TextEncoder().encode('public-test-secret-key-with-at-least-32-characters');

    const noTypeToken = await new SignJWT({ tid: 'tenant_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('sub_123')
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(secret);

    await expect(verifySessionToken(noTypeToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(noTypeToken)).rejects.toThrow('Invalid token type');
  });

  it('should throw UnauthorizedError for tampered token', async () => {
    const token = await signSessionToken('sub_123', 'tenant_456');

    // Tamper with the token by modifying a character
    const tamperedToken = token.slice(0, -5) + 'xxxxx';

    await expect(verifySessionToken(tamperedToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(tamperedToken)).rejects.toThrow('Invalid or expired session token');
  });

  it('should throw UnauthorizedError for completely invalid token', async () => {
    const invalidToken = 'not.a.valid.jwt.token';

    await expect(verifySessionToken(invalidToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(invalidToken)).rejects.toThrow('Invalid or expired session token');
  });

  it('should throw UnauthorizedError for token with missing sub claim', async () => {
    const secret = new TextEncoder().encode('public-test-secret-key-with-at-least-32-characters');

    // Create token without subject (sub)
    const noSubToken = await new SignJWT({ tid: 'tenant_123', type: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(secret);

    await expect(verifySessionToken(noSubToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(noSubToken)).rejects.toThrow('Invalid session token');
  });

  it('should throw UnauthorizedError for token with missing tid claim', async () => {
    const secret = new TextEncoder().encode('public-test-secret-key-with-at-least-32-characters');

    // Create token without tenantId (tid)
    const noTidToken = await new SignJWT({ type: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('sub_123')
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(secret);

    await expect(verifySessionToken(noTidToken)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(noTidToken)).rejects.toThrow('Invalid session token');
  });

  it('should throw UnauthorizedError for token signed with different secret', async () => {
    const differentSecret = new TextEncoder().encode('different-secret-key-that-is-also-32-chars-long');

    const tokenWithDifferentSecret = await new SignJWT({ tid: 'tenant_123', type: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('sub_123')
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(differentSecret);

    await expect(verifySessionToken(tokenWithDifferentSecret)).rejects.toThrow(UnauthorizedError);
    await expect(verifySessionToken(tokenWithDifferentSecret)).rejects.toThrow('Invalid or expired session token');
  });
});

describe('secret preference', () => {
  it('should use PUBLIC_SESSION_SECRET when available', async () => {
    // PUBLIC_SESSION_SECRET is already set in beforeAll
    const submissionId = 'sub_test';
    const tenantId = 'tenant_test';

    const token = await signSessionToken(submissionId, tenantId);
    const result = await verifySessionToken(token);

    expect(result.submissionId).toBe(submissionId);
    expect(result.tenantId).toBe(tenantId);
  });

  it('should fall back to SUPABASE_JWT_SECRET when PUBLIC_SESSION_SECRET is not set', async () => {
    // Save original value
    const originalPublicSecret = process.env.PUBLIC_SESSION_SECRET;

    // Remove PUBLIC_SESSION_SECRET temporarily
    delete process.env.PUBLIC_SESSION_SECRET;
    resetEnvCache();

    const submissionId = 'sub_fallback';
    const tenantId = 'tenant_fallback';

    const token = await signSessionToken(submissionId, tenantId);
    const result = await verifySessionToken(token);

    expect(result.submissionId).toBe(submissionId);
    expect(result.tenantId).toBe(tenantId);

    // Restore original value
    process.env.PUBLIC_SESSION_SECRET = originalPublicSecret;
    resetEnvCache();
  });
});
