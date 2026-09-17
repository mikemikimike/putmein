const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveSpawnCommand } = require("../bin/spawn-command");

test("resolves npx to its Windows command shim", () => {
  assert.equal(resolveSpawnCommand("npx", "win32"), "npx.cmd");
});

test("does not duplicate the Windows command shim", () => {
  assert.equal(resolveSpawnCommand("npx.CMD", "win32"), "npx.CMD");
});

test("keeps the executable unchanged on non-Windows platforms", () => {
  assert.equal(resolveSpawnCommand("npx", "linux"), "npx");
});
