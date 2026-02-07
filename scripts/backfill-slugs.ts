#!/usr/bin/env npx tsx
/**
 * Backfill slugs for all members missing slug (e.g. "Justin Trudeau" -> "justin-trudeau").
 * Run: npx tsx scripts/backfill-slugs.ts
 */
import "dotenv/config";
import { backfillSlugsForMembers } from "../src/lib/db-utils";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("\n========== Backfill Member Slugs ==========\n");
  const { updated } = await backfillSlugsForMembers();
  console.log(`Updated ${updated} member(s) with slugs.\n`);
}

main()
  .catch((e) => {
    console.error("[backfill-slugs] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
