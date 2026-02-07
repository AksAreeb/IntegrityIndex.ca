/**
 * Database Seed Check — Guardrails for High-Trust environment.
 * If Sector or Committee tables are empty, throws a descriptive error on startup.
 * Prevents blank pages caused by missing reference data.
 */

import { prisma } from "@/lib/db";

const SEED_CHECK_ERROR = `IntegrityIndex.ca: Database seed check failed.

The Sector or Committee tables are empty. The app requires these reference tables
to be populated before it can run correctly.

Run one of the following to fix:
  npm run db:seed
  npm run db:rebuild

See: https://github.com/IntegrityIndex/IntegrityIndex.ca#readme`;

export async function ensureSeedData(): Promise<void> {
  const [sectorCount, committeeCount] = await Promise.all([
    prisma.sector.count(),
    prisma.committee.count(),
  ]);

  if (sectorCount === 0) {
    throw new Error(
      `${SEED_CHECK_ERROR}\n\nMissing: Sector table is empty (expected 11 GICS sectors).`
    );
  }

  if (committeeCount === 0) {
    throw new Error(
      `${SEED_CHECK_ERROR}\n\nMissing: Committee table is empty (expected parliamentary committees).`
    );
  }
}
