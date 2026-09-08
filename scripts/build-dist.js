#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const RAY_DIR = path.join(ROOT_DIR, "ray");
const BRAIN_DIR = path.join(ROOT_DIR, "brain");
const COHEN_DIR = path.join(ROOT_DIR, "cohen");

function log(msg) {
  console.log(`\x1b[36m[BUILD]\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: false });
}

async function main() {
  log("Starting PutmeIn full distribution build...");

  // 1. Prepare dist directory
  if (fs.existsSync(DIST_DIR)) {
    log("Cleaning previous dist directory...");
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(DIST_DIR, "brain"), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, "ray"), { recursive: true });

  // 2. Build Brain Go Binary
  log("Compiling Brain Go binary (CGO_ENABLED=0)...");
  const isWindows = process.platform === "win32";
  const brainBinaryName = isWindows ? "brain.exe" : "brain";
  const brainOutPath = path.join(DIST_DIR, "brain", brainBinaryName);

  try {
    execSync(`go build -o "${brainOutPath}" .`, {
      cwd: BRAIN_DIR,
      env: { ...process.env, CGO_ENABLED: "0" },
      stdio: "inherit",
    });
    fs.chmodSync(brainOutPath, 0o755);
    success(`Brain compiled to dist/brain/${brainBinaryName}`);
  } catch (err) {
    error("Brain Go build failed: " + err.message);
    process.exit(1);
  }

  // 3. Build Cohen Go Binary (if cohen directory exists)
  if (fs.existsSync(COHEN_DIR)) {
    log("Compiling Cohen Go binary (CGO_ENABLED=0)...");
    const cohenBinaryName = isWindows ? "cohen.exe" : "cohen";
    const cohenOutDir = path.join(DIST_DIR, "cohen");
    fs.mkdirSync(cohenOutDir, { recursive: true });
    const cohenOutPath = path.join(cohenOutDir, cohenBinaryName);

    try {
      execSync(`go build -o "${cohenOutPath}" .`, {
        cwd: COHEN_DIR,
        env: { ...process.env, CGO_ENABLED: "0" },
        stdio: "inherit",
      });
      fs.chmodSync(cohenOutPath, 0o755);
      success(`Cohen compiled to dist/cohen/${cohenBinaryName}`);
    } catch (err) {
      log("Cohen build skipped or encountered error: " + err.message);
    }
  }

  // 4. Build Ray Next.js Standalone
  log("Generating Prisma client for Ray...");
  try {
    execSync("npx prisma generate", {
      cwd: RAY_DIR,
      stdio: "inherit",
    });
  } catch (err) {
    error("Prisma generate failed: " + err.message);
    process.exit(1);
  }

  log("Building Ray Next.js standalone bundle...");
  try {
    execSync("npm run build", {
      cwd: RAY_DIR,
      stdio: "inherit",
    });
  } catch (err) {
    error("Ray Next.js build failed: " + err.message);
    process.exit(1);
  }

  // 5. Stage Ray standalone artifacts into dist/ray
  log("Staging Ray standalone server and assets into dist/ray...");
  const standaloneSource = path.join(RAY_DIR, ".next", "standalone");
  const distRay = path.join(DIST_DIR, "ray");

  if (!fs.existsSync(standaloneSource)) {
    error("Next.js standalone directory not found at " + standaloneSource);
    process.exit(1);
  }

  copyDirRecursive(standaloneSource, distRay);

  // Next.js standalone docs require copying static files and public directory
  const rayStatic = path.join(RAY_DIR, ".next", "static");
  const destStatic = path.join(distRay, ".next", "static");
  if (fs.existsSync(rayStatic)) {
    log("Copying Next.js static assets...");
    copyDirRecursive(rayStatic, destStatic);
  }

  const rayPublic = path.join(RAY_DIR, "public");
  const destPublic = path.join(distRay, "public");
  if (fs.existsSync(rayPublic)) {
    log("Copying public assets...");
    copyDirRecursive(rayPublic, destPublic);
  }

  // 6. Security & Cleanliness Sanitization: Purge ALL secrets, .env files, and raw source code from dist/
  log("Sanitizing dist: removing all .env files and raw source code...");
  const forbiddenFiles = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "tsconfig.json",
    "tsconfig.tsbuildinfo",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "prisma.config.ts",
    "proxy.ts",
    "package-lock.json",
  ];

  const forbiddenDirs = [
    "src",
    "app",
    "scripts",
    "prisma",
  ];

  for (const f of forbiddenFiles) {
    const p = path.join(distRay, f);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { force: true });
    }
  }

  for (const d of forbiddenDirs) {
    const p = path.join(distRay, d);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
    }
  }

  // Safety Assertion: ensure zero .env files anywhere in dist
  try {
    const envMatches = execSync('find dist -name "*.env*" 2>/dev/null', { encoding: "utf-8" }).trim();
    if (envMatches) {
      error("CRITICAL SECURITY ERROR: .env files found in dist directory:\n" + envMatches);
      process.exit(1);
    }
  } catch (_) {}

  success("Sanitization complete: zero .env files or raw source code in dist!");
  success("Ray Next.js standalone assets staged cleanly in dist/ray!");
  success("Full PutmeIn distribution build completed successfully!");
}

main().catch((err) => {
  error("Build pipeline encountered an unexpected error: " + err);
  process.exit(1);
});
