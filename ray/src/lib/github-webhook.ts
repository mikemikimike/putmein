import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function verifyGithubWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null | undefined
): boolean {
  if (!secret || !signature?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const providedDigest = signature.slice(SIGNATURE_PREFIX.length);
  if (!/^[0-9a-fA-F]{64}$/.test(providedDigest)) {
    return false;
  }

  const expectedDigest = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const receivedDigest = Buffer.from(providedDigest, "hex");
  return receivedDigest.length === expectedDigest.length && timingSafeEqual(receivedDigest, expectedDigest);
}
