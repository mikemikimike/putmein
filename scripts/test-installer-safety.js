const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const installer = fs.readFileSync(
  path.join(__dirname, "..", "landing", "public", "install.ps1"),
  "utf8"
);

assert.doesNotMatch(installer, /pm2\s+(?:delete\s+all|kill)\b/i);
assert.match(installer, /ray\s+start/);
