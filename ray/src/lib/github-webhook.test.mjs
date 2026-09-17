import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyGithubWebhookSignature } from "./github-webhook.ts";

const rawBody = JSON.stringify({ action: "push", repository: { full_name: "putme-in/putmein" } });
const secret = "webhook-secret";
const validSignature = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;

test("accepts a valid GitHub webhook signature", () => {
  assert.equal(verifyGithubWebhookSignature(rawBody, validSignature, secret), true);
});

test("rejects missing and malformed signatures", () => {
  assert.equal(verifyGithubWebhookSignature(rawBody, null, secret), false);
  assert.equal(verifyGithubWebhookSignature(rawBody, "sha1=not-sha256", secret), false);
  assert.equal(verifyGithubWebhookSignature(rawBody, "sha256=not-hex", secret), false);
});

test("rejects a signature when the raw request body changes", () => {
  assert.equal(verifyGithubWebhookSignature(`${rawBody}!`, validSignature, secret), false);
});

test("rejects signatures without a configured secret", () => {
  assert.equal(verifyGithubWebhookSignature(rawBody, validSignature, null), false);
});
