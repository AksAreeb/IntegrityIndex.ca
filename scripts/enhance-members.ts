#!/usr/bin/env npx tsx
/**
 * Enhances all members: sets openParlId (OpenParliament slug) and fixes broken photoUrl
 * by using OpenParliament's image when the current photo 404s or is a known broken link.
 * Run: npx tsx scripts/enhance-members.ts
 */
import "dotenv/config";
import axios from "axios";
import { prisma } from "../src/lib/prisma";
import { slugFromName } from "../src/lib/slug";
import { PLACEHOLDER_MEMBER_PHOTO } from "../src/lib/scrapers/ciecScraper";

const OPENPARLIAMENT_PHOTO_BASE = "https://openparliament.ca/static/img/mpps/240";

const HEAD_OPTS = {
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
  },
  validateStatus: (s: number) => s === 200 || s === 404,
};

function isKnownBrokenPhotoUrl(url: string | null): boolean {
  if (!url || !url.trim()) return true;
  const u = url.trim();
  if (u === PLACEHOLDER_MEMBER_PHOTO) return true;
  if (u.startsWith("/")) return false;
  return false;
}

async function photoUrlReturns404(url: string): boolean {
  try {
    const res = await axios.head(url, HEAD_OPTS);
    return res.status === 404;
  } catch {
    return true;
  }
}

function openParliamentPhotoUrl(slug: string): string {
  return `${OPENPARLIAMENT_PHOTO_BASE}/${encodeURIComponent(slug)}.jpg`;
}

async function main() {
  console.log("\n========== Enhance Members (openParlId + photo fallback) ==========\n");

  const members = await prisma.member.findMany({
    select: { id: true, name: true, photoUrl: true, openParlId: true },
  });

  let photoUpdated = 0;
  let openParlUpdated = 0;

  for (const m of members) {
    const slug = slugFromName(m.name);

    const updates: { openParlId?: string; photoUrl?: string } = {};
    if (m.openParlId !== slug) {
      updates.openParlId = slug;
      openParlUpdated++;
    }

    let photoUrl = m.photoUrl?.trim() ?? null;
    if (isKnownBrokenPhotoUrl(photoUrl)) {
      photoUrl = openParliamentPhotoUrl(slug);
      updates.photoUrl = photoUrl;
      photoUpdated++;
    } else if (photoUrl && (await photoUrlReturns404(photoUrl))) {
      photoUrl = openParliamentPhotoUrl(slug);
      updates.photoUrl = photoUrl;
      photoUpdated++;
      console.log(`  [404] ${m.name} -> OpenParliament photo`);
    }

    if (Object.keys(updates).length === 0) continue;

    await prisma.member.update({
      where: { id: m.id },
      data: updates,
    });
  }

  console.log(`\nopenParlId set/updated for ${openParlUpdated} member(s).`);
  console.log(`photoUrl updated (broken/404 -> OpenParliament) for ${photoUpdated} member(s).\n`);
}

main()
  .catch((e) => {
    console.error("[enhance-members] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
