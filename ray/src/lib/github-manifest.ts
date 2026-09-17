export const DEFAULT_PUBLIC_ORIGIN = "http://localhost:4567";

const PUBLIC_ORIGIN_ENV = "RAY_PUBLIC_URL";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Resolves the canonical origin used by GitHub App manifest callbacks.
 * Request host headers are intentionally not considered here.
 */
export function resolvePublicOrigin(
  configuredOrigin: string | undefined = process.env[PUBLIC_ORIGIN_ENV],
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const rawOrigin = configuredOrigin?.trim();
  if (!rawOrigin) {
    if (nodeEnv === "production") {
      throw new Error(`${PUBLIC_ORIGIN_ENV} must be configured in production.`);
    }
    return DEFAULT_PUBLIC_ORIGIN;
  }

  let url: URL;
  try {
    url = new URL(rawOrigin);
  } catch {
    throw new Error(`${PUBLIC_ORIGIN_ENV} must be a valid absolute URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${PUBLIC_ORIGIN_ENV} must use http or https.`);
  }
  if (url.username || url.password) {
    throw new Error(`${PUBLIC_ORIGIN_ENV} must not contain credentials.`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${PUBLIC_ORIGIN_ENV} must contain only an origin.`);
  }

  return url.origin;
}

export function isPublicHttpsOrigin(origin: string): boolean {
  const url = new URL(origin);
  return url.protocol === "https:" && !LOCAL_HOSTNAMES.has(url.hostname);
}
