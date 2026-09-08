import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function resolveDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)
    ? process.env.DATABASE_URL.trim()
    : "mysql://root:root@127.0.0.1:3306/putmein";

  // Replace @localhost: with @127.0.0.1: to avoid IPv6 [::1] connection timeout on Linux
  url = url.replace("@localhost:", "@127.0.0.1:");

  // Guarantee allowPublicKeyRetrieval=true so MySQL 8.0 caching_sha2_password RSA handshake never hangs
  if (!url.includes("allowPublicKeyRetrieval")) {
    url += (url.includes("?") ? "&" : "?") + "allowPublicKeyRetrieval=true";
  }

  return url;
}

const prismaClientSingleton = () => {
  const dbUrl = resolveDatabaseUrl();
  const adapter = new PrismaMariaDb(dbUrl);
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

let _prisma: ReturnType<typeof prismaClientSingleton> | undefined;

// Lazy-loading proxy to prevent build-time crashes in Next.js
const prisma = new Proxy({} as ReturnType<typeof prismaClientSingleton>, {
  get: (target, prop) => {
    if (!_prisma) {
      _prisma = globalThis.prisma ?? prismaClientSingleton();

      if (process.env.NODE_ENV !== "production") {
        globalThis.prisma = _prisma;
      }
    }
    return (_prisma as any)[prop];
  },
});

export default prisma;
