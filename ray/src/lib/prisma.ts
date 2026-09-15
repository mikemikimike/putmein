import fs from "fs";
import path from "path";
import os from "os";
import mariadb, { type Pool, type PoolConfig } from "mariadb";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function loadEnvIfMissing(): void {
  if (process.env.DATABASE_URL?.trim()) return;

  const candidatePaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.join(os.homedir(), ".putmein", ".env"),
  ];

  for (const envPath of candidatePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("DATABASE_URL=") && !trimmed.startsWith("#")) {
            const rawVal = trimmed.slice("DATABASE_URL=".length).trim();
            const cleanVal = rawVal.replace(/^["'](.*)["']$/, "$1");
            if (cleanVal) {
              process.env.DATABASE_URL = cleanVal;
              return;
            }
          }
        }
      }
    } catch {
      // Continue searching other paths if read fails
    }
  }
}

function resolveDatabaseUrl(): string {
  loadEnvIfMissing();
  const envUrl = process.env.DATABASE_URL?.trim();
  if (!envUrl) {
    throw new Error(
      "DATABASE_URL environment variable is missing. Please define DATABASE_URL in your .env file."
    );
  }

  return envUrl;
}

function parseDbConfig(rawUrl: string): PoolConfig {
  // Replace @localhost: with @127.0.0.1: to avoid IPv6 [::1] connection timeout on Linux/macOS
  const normalized = rawUrl.replace("@localhost:", "@127.0.0.1:");
  const parsed = new URL(normalized);

  const host = parsed.hostname || "127.0.0.1";
  const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
  const user = decodeURIComponent(parsed.username || "root");
  const password = decodeURIComponent(parsed.password || "");
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "putmein";

  return {
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    connectTimeout: 7000,  // 7s fail-fast connection timeout
    acquireTimeout: 10000, // 10s max pool acquisition timeout (prevents 21s freeze)
    idleTimeout: 30000,    // 30s idle connection timeout
    allowPublicKeyRetrieval: true,
  };
}

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

function getOrCreatePool(config: PoolConfig): Pool {
  if (!globalThis.prismaPool) {
    globalThis.prismaPool = mariadb.createPool(config);
  }
  return globalThis.prismaPool;
}

const prismaClientSingleton = () => {
  const dbUrl = resolveDatabaseUrl();
  const poolConfig = parseDbConfig(dbUrl);
  const pool = getOrCreatePool(poolConfig);
  const adapter = new PrismaMariaDb(
    pool as unknown as ConstructorParameters<typeof PrismaMariaDb>[0]
  );
  return new PrismaClient({ adapter });
};

// Lazy-loading proxy to prevent build-time crashes in Next.js and guarantee persistent connection pool
const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!globalThis.prisma) {
      globalThis.prisma = prismaClientSingleton();
    }
    return (globalThis.prisma as unknown as Record<string, unknown>)[prop as string];
  },
});

export default prisma;
