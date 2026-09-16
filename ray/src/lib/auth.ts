import { SignJWT, jwtVerify } from "jose";
import { isTokenRevoked, revokeToken } from "./token-revocation";

const INSECURE_JWT_DEFAULTS = [
  "putmein-jwt-secret-default-key-2024",
  "fallback-secret-for-dev-only",
  "secret",
  "test",
  "dev",
  "123456",
  "password",
  "default",
];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is missing. Please define JWT_SECRET in your .env file."
    );
  }
  if (INSECURE_JWT_DEFAULTS.includes(secret)) {
    throw new Error(
      "JWT_SECRET is set to an insecure or well-known default key. Please generate a strong random 256-bit secret in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  jti?: string;
}

/**
 * Sign a JWT token for a user session with a cryptographically unique JTI claim.
 * Expires in 7 days.
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  const jti = payload.jti || crypto.randomUUID();
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

/**
 * Verify and decode a JWT token.
 * Returns null if invalid, expired, or revoked.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const jti = (payload.jti as string) || undefined;

    // Check revocation blocklist (both JTI and raw token hash)
    if (isTokenRevoked(jti, token)) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      jti,
    };
  } catch {
    return null;
  }
}

/**
 * Revoke a session JWT by extracting its claims and recording to the revocation store.
 */
export async function revokeSessionToken(token: string): Promise<boolean> {
  if (!token?.trim()) return false;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const jti = (payload.jti as string) || undefined;
    const exp = typeof payload.exp === "number" ? payload.exp : undefined;
    const userId = (payload.userId as string) || undefined;

    await revokeToken({
      token,
      jti,
      userId,
      expiresAt: exp,
    });
    return true;
  } catch {
    // If token verification fails (e.g. malformed), block its hash anyway
    await revokeToken({ token });
    return false;
  }
}

export { isTokenRevoked, revokeToken };

