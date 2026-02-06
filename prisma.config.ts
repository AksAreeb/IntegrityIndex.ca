import 'dotenv/config';
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 uses this to run your seed
    seed: "tsx prisma/seed.ts", 
  },
  datasource: {
    // We use DIRECT_URL (Port 5432) for seeds to bypass pooler limits
    url: env("DIRECT_URL"),
  },
});