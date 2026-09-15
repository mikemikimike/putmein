import path from "path";

// Prisma v7 config file
// The url here is only used for migrations/db push — runtime uses the adapter in src/lib/prisma.ts
const config = {
  schema: path.join(__dirname, "prisma/schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

export default config;
