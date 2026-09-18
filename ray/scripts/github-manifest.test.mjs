import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  DEFAULT_PUBLIC_ORIGIN,
  isPublicHttpsOrigin,
  resolvePublicOrigin,
} from "../src/lib/github-manifest.ts";

test("uses the configured canonical origin and strips a trailing slash", () => {
  assert.equal(
    resolvePublicOrigin("https://ray.example.com", "production"),
    "https://ray.example.com",
  );
  assert.equal(
    resolvePublicOrigin("https://ray.example.com/", "production"),
    "https://ray.example.com",
  );
});

test("uses a fixed local fallback outside production", () => {
  assert.equal(resolvePublicOrigin(undefined, "development"), DEFAULT_PUBLIC_ORIGIN);
});

test("fails closed when production has no valid public origin", () => {
  assert.throws(
    () => resolvePublicOrigin(undefined, "production"),
    /RAY_PUBLIC_URL must be configured in production/,
  );
  assert.throws(
    () => resolvePublicOrigin("javascript:alert(1)", "production"),
    /RAY_PUBLIC_URL must use http or https/,
  );
  assert.throws(
    () => resolvePublicOrigin("https://ray.example.com/callback", "production"),
    /RAY_PUBLIC_URL must contain only an origin/,
  );
});

test("only non-local HTTPS origins enable GitHub webhooks", () => {
  assert.equal(isPublicHttpsOrigin("http://ray.example.com"), false);
  assert.equal(isPublicHttpsOrigin("https://localhost:4567"), false);
  assert.equal(isPublicHttpsOrigin("https://ray.example.com"), true);
});

test("manifest route does not trust request host headers", async () => {
  const route = await readFile(new URL("../app/api/github/app/manifest/route.ts", import.meta.url), "utf8");

  assert.match(route, /resolvePublicOrigin\(\)/);
  assert.doesNotMatch(route, /x-forwarded-host|x-forwarded-proto|headers\.get\(["']host/);
});
