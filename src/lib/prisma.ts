/**
 * Prisma singleton re-export for use by seed and scripts.
 * The client is created in db.ts with @prisma/adapter-pg; this file exposes the same instance.
 *
 * Seed Check: instrumentation.ts runs ensureSeedData() on startup. If Sector or Committee
 * tables are empty, the app throws a descriptive error instead of showing a blank page.
 */
export { prisma } from "./db";
export { ensureSeedData } from "./seed-check";
