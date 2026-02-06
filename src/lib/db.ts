import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const POOLED_PORT = "6543";
const DIRECT_PORT = "5432";

/**
 * In production, use Supabase pooled connection (port 6543) to avoid exhausting
 * connection quota. If DATABASE_URL already uses 6543, leave it; else force 6543.
 */
function getConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is required for Prisma (use pooled port 6543 for app)");
  }
  if (process.env.NODE_ENV !== "production") {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (url.port === POOLED_PORT) return raw;
    url.port = POOLED_PORT;
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Prisma 7 Singleton: pg Pool + @prisma/adapter-pg.
 * Persisting on globalThis avoids "Column not available" (P2022) and connection
 * leaks under Turbopack/Next.js hot-reload (single client + single pool).
 * Pool max: 2 and connectionTimeoutMillis for serverless-safe connection use.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5000,
    });
  globalForPrisma.prismaPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;