/**
 * Shared enhance-members logic: sets openParlId (OpenParliament slug) and fixes
 * photoUrl using OpenParliament images when missing/broken. Uses a fallback
 * placeholder when the image URL is missing or returns 404 so the UI never breaks.
 * Used by sync (after roster fetch) and by scripts/enhance-members.ts.
 */
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { slugFromName } from "@/lib/slug";
import { PLACEHOLDER_MEMBER_PHOTO } from "@/lib/scrapers/ciecScraper";

const OPENPARLIAMENT_PHOTO_BASE = "https://openparliament.ca/static/img/mpps/240";

const HEAD_OPTS = {
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
  },
  validateStatus: (s: number) => s === 200 || s === 404,
};

function isKnownBrokenPhotoUrl(url: string | null): boolean {
  if (!url || !url.trim()) return true;
  const u = url.trim();
  if (u === PLACEHOLDER_MEMBER_PHOTO) return true;
  return false;
}

async function photoUrlReturns404(url: string): Promise<boolean> {
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

export type EnhanceMembersResult = {
  openParlUpdated: number;
  photoUpdated: number;
};

/**
 * Enhances all members: sets openParlId from name slug and fixes photoUrl.
 * When current photo is missing, placeholder, or 404s, tries OpenParliament image;
 * if that also 404s, sets the local placeholder so the UI never shows a broken image.
 * Call this after fetching/upserting members (e.g. from OurCommons or Open Parliament).
 */
export async function enhanceMembers(): Promise<EnhanceMembersResult> {
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
      const openParlUrl = openParliamentPhotoUrl(slug);
      const openParl404 = await photoUrlReturns404(openParlUrl);
      updates.photoUrl = openParl404 ? PLACEHOLDER_MEMBER_PHOTO : openParlUrl;
      photoUpdated++;
    } else if (photoUrl && (await photoUrlReturns404(photoUrl))) {
      const openParlUrl = openParliamentPhotoUrl(slug);
      const openParl404 = await photoUrlReturns404(openParlUrl);
      updates.photoUrl = openParl404 ? PLACEHOLDER_MEMBER_PHOTO : openParlUrl;
      photoUpdated++;
    }

    if (Object.keys(updates).length === 0) continue;

    await prisma.member.update({
      where: { id: m.id },
      data: updates,
    });
  }

  return { openParlUpdated, photoUpdated };
}
