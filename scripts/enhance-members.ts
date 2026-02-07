#!/usr/bin/env npx tsx
/**
 * Enhances all members: sets openParlId (OpenParliament slug) and fixes broken photoUrl
 * by using OpenParliament's image when the current photo 404s or is a known broken link.
 * Missing or 404ing images get the local placeholder so the UI doesn't look broken.
 * Run: npx tsx scripts/enhance-members.ts
 *
 * Same logic runs automatically after roster sync in sync-engine (syncMembers).
 */
import "dotenv/config";
import { enhanceMembers } from "../src/lib/enhance-members";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("\n========== Enhance Members (openParlId + photo fallback) ==========\n");

  const { openParlUpdated, photoUpdated } = await enhanceMembers();

  console.log(`\nopenParlId set/updated for ${openParlUpdated} member(s).`);
  console.log(`photoUrl updated (broken/404 -> OpenParliament or placeholder) for ${photoUpdated} member(s).\n`);
}

main()
  .catch((e) => {
    console.error("[enhance-members] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
