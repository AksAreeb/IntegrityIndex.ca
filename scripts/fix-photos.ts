#!/usr/bin/env npx tsx
/**
 * Updates photoUrl for all members using the official 45th Parliament high-res format.
 * If the remote photo returns 404, sets photoUrl to /images/placeholder-member.png.
 * Run: npx tsx scripts/fix-photos.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  resolveFederalPhotoUrl,
  PLACEHOLDER_MEMBER_PHOTO,
} from "../src/lib/scrapers/ciecScraper";

const JURISDICTION_FEDERAL = "FEDERAL";

async function main() {
  console.log("\n========== Fix Member Photos (45th Parliament) ==========\n");

  const members = await prisma.member.findMany({
    select: { id: true, name: true, jurisdiction: true, officialId: true, photoUrl: true },
  });

  let updated = 0;
  let placeholders = 0;

  for (const m of members) {
    if (m.jurisdiction !== JURISDICTION_FEDERAL) {
      continue;
    }

    const memberId = (m.officialId ?? m.id).trim();
    if (!memberId) continue;

    const urlToStore = await resolveFederalPhotoUrl(memberId);
    const isPlaceholder = urlToStore === PLACEHOLDER_MEMBER_PHOTO;
    if (isPlaceholder) placeholders++;

    if (m.photoUrl === urlToStore) continue;

    await prisma.member.update({
      where: { id: m.id },
      data: { photoUrl: urlToStore },
    });
    updated++;
    const label = isPlaceholder ? " (placeholder)" : "";
    console.log(`  ${m.name} (${m.id}) -> ${urlToStore}${label}`);
  }

  console.log(`\nUpdated ${updated} federal member(s); ${placeholders} use placeholder.\n`);
}

main()
  .catch((e) => {
    console.error("[fix-photos] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
