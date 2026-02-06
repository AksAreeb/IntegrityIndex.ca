/**
 * Prisma singleton re-export for use by seed and scripts.
 * The client is created in db.ts with @prisma/adapter-pg; this file exposes the same instance.
 */
export { prisma } from "./db";
