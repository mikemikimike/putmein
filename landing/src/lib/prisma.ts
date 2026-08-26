import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

let _prisma: ReturnType<typeof prismaClientSingleton> | undefined;

// Using a Proxy for lazy-loading to prevent build-time crashes in Next.js
const prisma = new Proxy({} as ReturnType<typeof prismaClientSingleton>, {
  get: (target, prop) => {
    if (!_prisma) {
      _prisma = globalThis.prisma ?? prismaClientSingleton();

      if (process.env.NODE_ENV !== "production") {
        globalThis.prisma = _prisma;
      }
    }
    return (_prisma as any)[prop];
  }
});

export default prisma;