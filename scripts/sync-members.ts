#!/usr/bin/env npx tsx
/**
 * Syncs Federal MPs and Ontario MPPs into the database with correct name parsing.
 * If the source provides a single name string, splits it into firstName and lastName.
 * All Prisma upsert calls map name, firstName, lastName, party, and photoUrl.
 * Run: npx tsx scripts/sync-members.ts [limit] [offset]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fetchFederalMembers } from "../src/lib/sync";
import { fetchOntarioMpps } from "../src/lib/scrapers/ontario";
import { getMemberPhotoUrl as getFederalPhotoUrl } from "../src/lib/scrapers/ciecScraper";
import { slugFromName } from "../src/lib/slug";

const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/member/profile-photo";

function normalize(s: string | null | undefined, defaultVal: string): string {
  const t = (s ?? "").trim();
  return t && t !== "(not available)" ? t : defaultVal;
}

/**
 * Split a single name string into firstName and lastName.
 * Last word = lastName, everything else = firstName (e.g. "Justin Trudeau" -> Justin, Trudeau).
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const name = (fullName ?? "").trim();
  if (!name) return { firstName: "Unknown", lastName: "Unknown" };
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

async function main() {
  const limit = Math.min(200, Math.max(1, parseInt(process.argv[2] ?? "50", 10) || 50));
  const offset = Math.max(0, parseInt(process.argv[3] ?? "0", 10) || 0);

  console.log("\n========== Sync Members (with firstName/lastName parsing) ==========\n");

  const [federalList, ontarioList] = await Promise.all([
    fetchFederalMembers(),
    fetchOntarioMpps().catch(() => []),
  ]);

  type Row = {
    type: "federal" | "provincial";
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    riding: string;
    party: string;
    photoUrl: string;
    slug?: string;
  };

  const federalRows: Row[] = federalList.map((m) => {
    const name = normalize(m.name, "Unknown");
    const { firstName, lastName } = splitName(name);
    return {
      type: "federal" as const,
      id: m.id,
      name,
      firstName,
      lastName,
      riding: normalize(m.riding, "Unknown"),
      party: normalize(m.party, "Independent"),
      photoUrl: getFederalPhotoUrl(m.id),
    };
  });

  const ontarioRows: Row[] = ontarioList.map((m) => {
    const name = normalize(m.name, "Unknown");
    const { firstName, lastName } = splitName(name);
    const olaSlug = (m as { olaSlug?: string }).olaSlug ?? m.id.replace(/^ON-/, "");
    const photoUrl =
      (m as { imageUrl?: string }).imageUrl?.trim() ||
      `${OLA_MPP_PHOTO_BASE}/${olaSlug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("_")}.jpg`;
    return {
      type: "provincial" as const,
      id: m.id,
      name,
      firstName,
      lastName,
      riding: normalize(m.riding, "Unknown"),
      party: normalize(m.party, "Independent"),
      photoUrl,
      slug: slugFromName(name),
    };
  });

  const combined = [...federalRows, ...ontarioRows];
  const batch = combined.slice(offset, offset + limit);
  let upserted = 0;

  for (const row of batch) {
    const data = {
      name: row.name,
      firstName: row.firstName,
      lastName: row.lastName,
      riding: row.riding,
      party: row.party,
      photoUrl: row.photoUrl,
    };

    if (row.type === "federal") {
      await prisma.member.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          ...data,
          jurisdiction: "FEDERAL",
          chamber: "House of Commons",
        },
        update: data,
      });
    } else {
      await prisma.member.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          ...data,
          jurisdiction: "PROVINCIAL",
          chamber: "Legislative Assembly",
          slug: row.slug ?? slugFromName(row.name),
        },
        update: { ...data, slug: row.slug ?? slugFromName(row.name) },
      });
    }
    upserted += 1;
  }

  console.log(`Upserted ${upserted} members (offset=${offset}, limit=${limit}, total available=${combined.length}).\n`);
}

main()
  .catch((e) => {
    console.error("[sync-members] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
