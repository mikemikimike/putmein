#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const rayDir = path.resolve(__dirname, "..");
const candidatePaths = [
  path.join(rayDir, ".next", "standalone", "server.js"),
  path.join(rayDir, ".next", "standalone", "ray", "server.js"),
];

const serverScript = candidatePaths.find((p) => fs.existsSync(p));

if (!serverScript) {
  console.error("\x1b[31m[ERROR]\x1b[0m Standalone server.js not found in .next/standalone. Please run 'npm run build' first.");
  process.exit(1);
}

// Ensure working directory is the folder containing server.js so relative asset lookups succeed
process.chdir(path.dirname(serverScript));
require(serverScript);
