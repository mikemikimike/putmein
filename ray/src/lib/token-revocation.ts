import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

declare global {
  // eslint-disable-next-line no-var
  var __putmein_revoked_tokens: Map<string, number> | undefined;
}

/**
 * Returns the path to the persisted revocation file.
 * Defaults to ~/.putmein/revoked_tokens.json with a fallback to os.tmpdir().
 */
function getRevocationFilePath(): string {
  try {
    const dir = path.join(os.homedir(), ".putmein");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, "revoked_tokens.json");
  } catch {
    return path.join(os.tmpdir(), "putmein_revoked_tokens.json");
  }
}

/**
 * Lazy singleton for the in-memory revocation store.
 * Survives Next.js Turbopack/HMR reloads via globalThis.
 */
function getRevocationMap(): Map<string, number> {
  if (!globalThis.__putmein_revoked_tokens) {
    const map = new Map<string, number>();
    globalThis.__putmein_revoked_tokens = map;

    // Hydrate from file
    try {
      const filePath = getRevocationFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: Record<string, number> = JSON.parse(raw);
        const now = Date.now();
        for (const [key, expiresAt] of Object.entries(parsed)) {
          if (typeof expiresAt === "number" && expiresAt > now) {
            map.set(key, expiresAt);
          }
        }
      }
    } catch {
      // Non-fatal if read or parse fails
    }
  }

  return globalThis.__putmein_revoked_tokens;
}

/**
 * Persists active non-expired revocations to disk.
 */
function persistRevocationsToFile(map: Map<string, number>): void {
  try {
    const filePath = getRevocationFilePath();
    const now = Date.now();
    const payload: Record<string, number> = {};

    for (const [key, expiresAt] of map.entries()) {
      if (expiresAt > now) {
        payload[key] = expiresAt;
      } else {
        map.delete(key);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(payload), { mode: 0o600 });
  } catch {
    // Non-fatal if filesystem write fails
  }
}

/**
 * Compute SHA-256 hash of a raw token string for safe keying.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export interface RevokeTokenOptions {
  token?: string;
  jti?: string;
  userId?: string;
  expiresAt?: number | Date;
}

/**
 * Revoke a token by its unique JWT ID (jti) and/or raw token hash.
 * Persists immediately to L1 memory and L2 file store, then attempts L3 DB sync.
 */
export async function revokeToken(options: RevokeTokenOptions): Promise<void> {
  const map = getRevocationMap();
  const now = Date.now();

  let expiresAtMs: number;
  if (options.expiresAt instanceof Date) {
    expiresAtMs = options.expiresAt.getTime();
  } else if (typeof options.expiresAt === "number") {
    expiresAtMs = options.expiresAt > 10_000_000_000 ? options.expiresAt : options.expiresAt * 1000;
  } else {
    // Default to 7 days fallback
    expiresAtMs = now + 7 * 24 * 60 * 60 * 1000;
  }

  let tokenHash: string | undefined;
  if (options.token) {
    tokenHash = hashToken(options.token);
    map.set(tokenHash, expiresAtMs);
  }

  if (options.jti) {
    map.set(options.jti, expiresAtMs);
  }

  // Persist to file
  persistRevocationsToFile(map);

  // Attempt async DB sync if prisma is available and table exists
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const dbClient = prisma as unknown as {
      rayRevokedToken?: {
        create: (args: {
          data: {
            jti?: string;
            tokenHash?: string;
            userId?: string;
            expiresAt: Date;
          };
        }) => Promise<unknown>;
      };
    };

    if (dbClient?.rayRevokedToken) {
      await dbClient.rayRevokedToken.create({
        data: {
          jti: options.jti,
          tokenHash: tokenHash,
          userId: options.userId,
          expiresAt: new Date(expiresAtMs),
        },
      });
    }
  } catch {
    // Non-fatal: in-memory and file-backed revocation ensures security even without DB
  }
}

/**
 * Synchronously checks whether a token or JTI has been revoked.
 * Extremely fast O(1) lookup suitable for middleware and proxy layers.
 */
export function isTokenRevoked(jti?: string | null, token?: string | null): boolean {
  if (!jti && !token) return false;

  const map = getRevocationMap();
  const now = Date.now();

  // Check by JTI
  if (jti && map.has(jti)) {
    const expiresAt = map.get(jti)!;
    if (expiresAt > now) {
      return true;
    }
    map.delete(jti);
  }

  // Check by token hash
  if (token) {
    const tokenHash = hashToken(token);
    if (map.has(tokenHash)) {
      const expiresAt = map.get(tokenHash)!;
      if (expiresAt > now) {
        return true;
      }
      map.delete(tokenHash);
    }
  }

  return false;
}

/**
 * Periodic prune of expired revoked entries.
 */
export function pruneExpiredTokens(): void {
  const map = getRevocationMap();
  const now = Date.now();
  let changed = false;

  for (const [key, expiresAt] of map.entries()) {
    if (expiresAt <= now) {
      map.delete(key);
      changed = true;
    }
  }

  if (changed) {
    persistRevocationsToFile(map);
  }
}
