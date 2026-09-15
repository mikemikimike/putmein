/**
 * In-memory sliding-window rate limiter for server-side API endpoints.
 * Requires zero database changes.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export class RateLimiter {
  private windowMs: number;
  private maxAttempts: number;
  private hits = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();

  constructor(options: { windowMs: number; maxAttempts: number }) {
    this.windowMs = options.windowMs;
    this.maxAttempts = options.maxAttempts;
  }

  private cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;
    for (const [key, entry] of this.hits.entries()) {
      if (entry.resetAt <= now) {
        this.hits.delete(key);
      }
    }
  }

  /**
   * Check whether an attempt is allowed without consuming quota.
   */
  public check(key: string): RateLimitResult {
    this.cleanup();
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      return {
        allowed: true,
        remaining: this.maxAttempts,
        resetInSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    const remaining = Math.max(0, this.maxAttempts - entry.count);
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    return {
      allowed: entry.count < this.maxAttempts,
      remaining,
      resetInSeconds,
    };
  }

  /**
   * Consume an attempt strike and return updated rate-limit status.
   */
  public consume(key: string): RateLimitResult {
    this.cleanup();
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetInSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, this.maxAttempts - entry.count);
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    return {
      allowed: entry.count <= this.maxAttempts,
      remaining,
      resetInSeconds,
    };
  }

  /**
   * Reset the rate limit counter for a specific key (e.g. after successful authentication).
   */
  public reset(key: string): void {
    this.hits.delete(key);
  }
}

/**
 * Extracts client IP from request headers (x-forwarded-for or x-real-ip), falling back to localhost.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

// 5 failed attempts per 5 minutes per IP or account for login
export const authRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,
  maxAttempts: 5,
});

// 5 requests per 10 minutes for admin setup
export const setupRateLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
});

// 5 failed password change attempts per 5 minutes
export const changePasswordRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,
  maxAttempts: 5,
});
