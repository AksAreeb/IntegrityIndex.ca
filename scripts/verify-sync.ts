#!/usr/bin/env npx tsx
/**
 * Integrity Audit Script — Verifies every Prisma model for data presence.
 * Run: npx tsx scripts/verify-sync.ts
 * Or: npm run db:rebuild (includes this after seed)
 */
import "dotenv/config";
import { runVerifySync } from "../src/lib/verify-sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("\n========== Integrity Audit (verify-sync) ==========\n");

  const report = await runVerifySync();

  for (const r of report.results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`${icon} ${r.model}: ${r.detail}`);
    if (r.issues?.length) {
      for (const issue of r.issues) console.log(`  ⚠ ${issue}`);
    }
  }

  console.log("\n----------------------------------------");
  console.log(report.summary);
  console.log("========================================\n");

  if (!report.ok) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("[verify-sync] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
