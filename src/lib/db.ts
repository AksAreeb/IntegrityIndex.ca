import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { slugFromName } from "@/lib/slug";

/**
 * Global Singleton: attach Prisma client and pg Pool to globalThis so the same
 * instance is reused across hot-reloads and function invocations in the same process.
 * Prevents "Connection Timeout" and connection exhaustion during Cron and serverless.
 */
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
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  const extended = base.$extends({
    query: {
      member: {
        async create({ args, query }) {
          const data = args.data as { slug?: string; name?: string };
          if ((!data.slug || data.slug === "") && data.name) {
            (args.data as { slug?: string }).slug = slugFromName(data.name);
          }
          return query(args);
        },
        async update({ args, query }) {
          const data = args.data as { slug?: string; name?: string };
          if (data && "name" in data && (!data.slug || data.slug === "") && data.name) {
            (args.data as { slug?: string }).slug = slugFromName(data.name);
          }
          return query(args);
        },
        async upsert({ args, query }) {
          const create = args.create as { slug?: string; name?: string };
          const update = args.update as { slug?: string; name?: string };
          if (create && (!create.slug || create.slug === "") && create.name) {
            (args.create as { slug?: string }).slug = slugFromName(create.name);
          }
          if (update && "name" in update && (!update.slug || update.slug === "") && update.name) {
            (args.update as { slug?: string }).slug = slugFromName(update.name);
          }
          return query(args);
        },
      },
    },
  });

  return extended as unknown as PrismaClient;
}

// Single assignment: reuse existing client or create once and store on global
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}
export const prisma = globalForPrisma.prisma;