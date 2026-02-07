// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  // Migrate uses direct + shadow; app runtime uses DATABASE_URL (pooled) in db.ts
  datasource: {
    url: env("DIRECT_URL"),
    directUrl: env("DIRECT_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});