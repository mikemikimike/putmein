const path = require("path");
const fs = require("fs");
const os = require("os");

// Load local user config from ~/.putmein/.env if it exists
const configDir = path.join(os.homedir(), ".putmein");
const userEnvPath = path.join(configDir, ".env");
let userEnv = {};

if (fs.existsSync(userEnvPath)) {
  const content = fs.readFileSync(userEnvPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      userEnv[key] = val;
    }
  }
}

// Fallback to project root .env if userEnv is empty
const rootEnvPath = path.join(__dirname, ".env");
if (Object.keys(userEnv).length === 0 && fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      userEnv[key] = val;
    }
  }
}

// Resolve paths for Brain binary
const isWindows = process.platform === "win32";
const brainBinaryName = isWindows ? "brain.exe" : "brain";
const archMap = { x64: "x64", arm64: "arm64" };
const normArch = archMap[process.arch] || process.arch;

const candidateBrainPaths = [
  path.join(__dirname, "dist", "brain", `brain-${process.platform}-${normArch}${isWindows ? ".exe" : ""}`),
  path.join(__dirname, "dist", "brain", brainBinaryName),
  path.join(__dirname, "brain", "bin", brainBinaryName),
  path.join(__dirname, "bin", brainBinaryName),
];

const brainScript = candidateBrainPaths.find((p) => fs.existsSync(p)) || candidateBrainPaths[1];

if (fs.existsSync(brainScript) && !isWindows) {
  try {
    fs.chmodSync(brainScript, 0o755);
  } catch (_) {}
}

// Resolve paths for Ray Next.js standalone server
const candidateRayPaths = [
  path.join(__dirname, "dist", "ray", "server.js"),
  path.join(__dirname, "ray", ".next", "standalone", "server.js"),
];

const rayScript = candidateRayPaths.find((p) => fs.existsSync(p)) || candidateRayPaths[0];
const rayCwd = path.dirname(rayScript);

const rayPort = process.env.RAY_PORT || userEnv.RAY_PORT || "4567";
const brainPort = process.env.BRAIN_PORT || userEnv.BRAIN_PORT || "4500";
const brainSecret = process.env.BRAIN_INTERNAL_SECRET || userEnv.BRAIN_INTERNAL_SECRET || "brain-ray-internal-putmein-2024";

module.exports = {
  apps: [
    {
      name: "putmein-brain",
      script: brainScript,
      cwd: path.dirname(brainScript),
      interpreter: "none",
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        BRAIN_PORT: brainPort,
        RAY_URL: `http://localhost:${rayPort}`,
        BRAIN_INTERNAL_SECRET: brainSecret,
        AGENT_AUTONOMOUS: userEnv.AGENT_AUTONOMOUS || "false",
        ...userEnv,
      },
    },
    {
      name: "putmein-ray",
      script: rayScript,
      cwd: rayCwd,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        PORT: rayPort,
        NODE_ENV: "production",
        BRAIN_URL: `http://localhost:${brainPort}`,
        NEXT_PUBLIC_BRAIN_URL: `http://localhost:${brainPort}`,
        BRAIN_INTERNAL_SECRET: brainSecret,
        ...userEnv,
      },
    },
  ],
};
