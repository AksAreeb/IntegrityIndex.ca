/**
 * Member Discovery — 45th Parliament roster from OurCommons.
 * Fetches the real list from OurCommons (export JSON = machine-readable version of
 * https://www.ourcommons.ca/members/en/search) and upserts names, ridings, parties into Member table.
 * Source: https://www.ourcommons.ca/en/members/export/json
 */

import { prisma } from "@/lib/prisma";
import { fetchFederalMembers } from "@/lib/sync";
import { getMemberPhotoUrl } from "@/lib/scrapers/ciecScraper";

const FEDERAL_CHAMBER = "House of Commons";
const JURISDICTION_FEDERAL = "FEDERAL";

/**
 * Party should come from OurCommons CaucusShortName (or Party) in the sync layer.
 * If it's missing, empty, or wrongly set to the member's name, default to Independent.
 */
function partyForUpsert(party: string, name: string): string {
  const p = (party ?? "").trim();
  if (!p) return "Independent";
  if (p === (name ?? "").trim()) return "Independent";
  return p;
}

/**
 * Fetches the real 45th Parliament list from OurCommons and upserts into Member table.
 * Uses prisma.member.upsert so we don't create duplicates on every run.
 * Party is taken from the record (CaucusShortName from OurCommons); defaults to Independent when missing.
 * @returns Number of members upserted (target 343).
 */
export async function discoverMembers(): Promise<number> {
  const records = await fetchFederalMembers();
  if (records.length === 0) {
    console.warn("[memberScraper] No federal members returned from OurCommons export.");
    return 0;
  }

  let upserted = 0;
  for (const mp of records) {
    const id = mp.id.trim() || `${mp.name}-${mp.riding}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const party = partyForUpsert(mp.party, mp.name);
    await prisma.member.upsert({
      where: { id },
      create: {
        id,
        name: mp.name,
        riding: mp.riding,
        party,
        jurisdiction: JURISDICTION_FEDERAL,
        chamber: FEDERAL_CHAMBER,
        photoUrl: getMemberPhotoUrl(id),
      },
      update: {
        name: mp.name,
        riding: mp.riding,
        party,
        photoUrl: getMemberPhotoUrl(id),
      },
    });
    upserted++;
  }

  return upserted;
}
