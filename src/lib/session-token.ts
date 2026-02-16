import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from '../env';
import { UnauthorizedError } from './errors';

function getSecret(): Uint8Array {
  const env = getEnv();
  const secret = env.PUBLIC_SESSION_SECRET ?? env.SUPABASE_JWT_SECRET;
  return new TextEncoder().encode(secret);
}

/**
 * Signs a session token for a public session.
 * Contains submissionId (sub), tenantId (tid), and type='session'.
 * Expires in 30 minutes.
 */
export async function signSessionToken(
  submissionId: string,
  tenantId: string,
): Promise<string> {
  return new SignJWT({ tid: tenantId, type: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(submissionId)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(getSecret());
}

/**
 * Verifies a session token and extracts the submissionId and tenantId.
 * Throws UnauthorizedError if the token is invalid, expired, or wrong type.
 */
export async function verifySessionToken(
  token: string,
): Promise<{ submissionId: string; tenantId: string }> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });

    if (payload.type !== 'session') {
      throw new UnauthorizedError('Invalid token type');
    }

    const submissionId = payload.sub;
    const tenantId = payload.tid as string | undefined;

    if (!submissionId || !tenantId) {
      throw new UnauthorizedError('Invalid session token');
    }

    return { submissionId, tenantId };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired session token');
  }
}
