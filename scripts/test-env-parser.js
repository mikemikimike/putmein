const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "putmein-env-test-"));

try {
  fs.mkdirSync(path.join(tempDir, "ray"));
  fs.copyFileSync(path.join(rootDir, "ecosystem.config.js"), path.join(tempDir, "ecosystem.config.js"));
  fs.writeFileSync(
    path.join(tempDir, "ray", ".env"),
    [
      'JWT_SECRET="regression-test-secret"',
      'DATABASE_URL="mysql://user:pass@localhost:3306/db?ssl=true"',
      'COMPLEX_SECRET="base64==#fragment"',
      "UNQUOTED_SECRET=token=part # inline comment",
      "SPACED_SECRET = spaced value",
      "# IGNORED_SECRET=should-not-load",
      "",
    ].join("\n"),
  );

  const child = spawnSync(
    process.execPath,
    [
      "-e",
      `const config = require(${JSON.stringify(path.join(tempDir, "ecosystem.config.js"))});
const env = config.apps[0].env;
process.stdout.write(JSON.stringify({
  databaseUrl: env.DATABASE_URL,
  complexSecret: env.COMPLEX_SECRET,
  unquotedSecret: env.UNQUOTED_SECRET,
  spacedSecret: env.SPACED_SECRET,
  ignoredSecret: env.IGNORED_SECRET,
}));`,
    ],
    {
      cwd: tempDir,
      env: { ...process.env, NODE_PATH: path.join(rootDir, "node_modules") },
      encoding: "utf8",
    },
  );

  assert.strictEqual(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.strictEqual(result.databaseUrl, "mysql://user:pass@127.0.0.1:3306/db?ssl=true&allowPublicKeyRetrieval=true");
  assert.strictEqual(result.complexSecret, "base64==#fragment");
  assert.strictEqual(result.unquotedSecret, "token=part");
  assert.strictEqual(result.spacedSecret, "spaced value");
  assert.strictEqual(result.ignoredSecret, undefined);
  console.log("Environment parser regression passed");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
