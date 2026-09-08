import path from "path";

// Prisma v7 config file
// The url here is only used for migrations/db push — runtime uses the adapter in src/lib/prisma.ts
const config = {
  schema: path.join(__dirname, "prisma/schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL || "mysql://root:GMXWFEH7Efk0C3FPLZWQDT50UWLM2DX42yH0zqQj782YdU2XxuJigdLuGRiecCUY@37.60.237.239:3306/putmein",
  },
};

export default config;
