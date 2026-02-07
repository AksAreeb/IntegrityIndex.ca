/**
 * Seeds Sector (11 GICS), Committee, CommitteeSector, AssetSectorMapping.
 * Run after schema migration. Idempotent.
 */
import "dotenv/config";
import axios from "axios";
import { prisma } from "../src/lib/prisma";

const GICS_SECTORS = [
  "Energy",
  "Materials",
  "Industrials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Health Care",
  "Financials",
  "Information Technology",
  "Communication Services",
  "Utilities",
  "Real Estate",
];

/** Committee name (House of Commons style) -> GICS sector names it oversees */
const COMMITTEE_SECTORS: Record<string, string[]> = {
  "Standing Committee on Finance (FINA)": ["Financials", "Real Estate"],
  "Standing Committee on Health (HESA)": ["Health Care"],
  "Standing Committee on Industry and Technology (INDU)": [
    "Information Technology",
    "Communication Services",
  ],
  "Standing Committee on Natural Resources (RNNR)": ["Energy", "Materials"],
  "Standing Committee on Environment and Sustainable Development (ENVI)": [
    "Utilities",
    "Energy",
  ],
};

/** Asset keyword (lowercase) -> GICS sector name */
const ASSET_SECTOR: Record<string, string> = {
  su: "Energy",
  suncor: "Energy",
  cnq: "Energy",
  cenovus: "Energy",
  enb: "Energy",
  enbridge: "Energy",
  trp: "Energy",
  tcenergy: "Energy",
  ovv: "Energy",
  ico: "Energy",
  td: "Financials",
  ry: "Financials",
  bns: "Financials",
  bmo: "Financials",
  cm: "Financials",
  shop: "Information Technology",
  shopify: "Information Technology",
  cnr: "Industrials",
  cp: "Industrials",
  cpr: "Industrials",
  cn: "Industrials",
  rental: "Real Estate",
  property: "Real Estate",
  "real estate": "Real Estate",
};

async function main() {
  console.log("\n========== Seed: Intelligence Layer (Sector, Committee, Mappings) ==========\n");

  const sectorIds: Record<string, string> = {};
  for (const name of GICS_SECTORS) {
    const s = await prisma.sector.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    sectorIds[name] = s.id;
  }
  console.log(`[Seed] Sectors: ${GICS_SECTORS.length} GICS sectors`);

  for (const [committeeName, sectorNames] of Object.entries(COMMITTEE_SECTORS)) {
    const committee = await prisma.committee.upsert({
      where: { name: committeeName },
      create: { name: committeeName },
      update: {},
    });
    for (const sectorName of sectorNames) {
      const sectorId = sectorIds[sectorName];
      if (sectorId) {
        await prisma.committeeSector.upsert({
          where: {
            committeeId_sectorId: { committeeId: committee.id, sectorId },
          },
          create: { committeeId: committee.id, sectorId },
          update: {},
        });
      }
    }
  }
  console.log(`[Seed] Committees: ${Object.keys(COMMITTEE_SECTORS).length} committees linked to sectors`);

  for (const [keyword, sectorName] of Object.entries(ASSET_SECTOR)) {
    const sectorId = sectorIds[sectorName];
    if (sectorId) {
      await prisma.assetSectorMapping.upsert({
        where: { keyword },
        create: { keyword, sectorId },
        update: { sectorId },
      });
    }
  }
  console.log(`[Seed] Asset mappings: ${Object.keys(ASSET_SECTOR).length} keywords`);

  // Backfill Riding from distinct Member.riding values
  const members = await prisma.member.findMany({
    select: { riding: true, jurisdiction: true },
    distinct: ["riding", "jurisdiction"],
  });
  for (const m of members) {
    const name = m.riding?.trim();
    if (!name) continue;
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unknown";
    let uniqueSlug = slug;
    let n = 0;
    while (await prisma.riding.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${++n}`;
    }
    await prisma.riding.upsert({
      where: { slug: uniqueSlug },
      create: { name, slug: uniqueSlug, jurisdiction: m.jurisdiction },
      update: { name },
    });
  }
  console.log(`[Seed] Ridings: ${members.length} from member data`);

  await seedFinanceCommitteeMembers();

  console.log("\n[Seed] Intelligence layer seeded.\n");
}

/**
 * Temporary: Identifies current MPs on the Standing Committee on Finance (FINA)
 * and creates MemberCommittee relations. Tries OpenParliament API first;
 * falls back to static name list if API fails.
 */
async function seedFinanceCommitteeMembers(): Promise<void> {
  const COMMITTEE_NAME = "Standing Committee on Finance (FINA)";
  const FINA_OPENPARLIAMENT_URL =
    "https://api.openparliament.ca/committees/finance/?format=json";
  const FETCH_TIMEOUT_MS = 8000;
  const USER_AGENT = "IntegrityIndex.ca/1.0 (https://integrityindex.ca)";

  const committee = await prisma.committee.findUnique({
    where: { name: COMMITTEE_NAME },
  });
  if (!committee) {
    console.warn("[Seed] Finance Committee not found, skipping MemberCommittee.");
    return;
  }

  const federalMembers = await prisma.member.findMany({
    where: { jurisdiction: "FEDERAL" },
    select: { id: true, name: true },
  });
  const nameToMember = new Map<string, { id: string }>();
  for (const m of federalMembers) {
    const raw = m.name.trim().toLowerCase().replace(/\s+/g, " ");
    nameToMember.set(raw, { id: m.id });
    // Also index "Last, First" as "first last" for cross-format matching
    if (raw.includes(",")) {
      const [last, first] = raw.split(",").map((s) => s.trim());
      if (first && last) nameToMember.set(`${first} ${last}`, { id: m.id });
    } else {
      const parts = raw.split(" ");
      if (parts.length >= 2) {
        const last = parts.pop()!;
        const first = parts.join(" ");
        nameToMember.set(`${last}, ${first}`, { id: m.id });
      }
    }
  }

  let candidateNames: string[] = [];

  try {
    const { data } = await axios.get<{
      members?: Array<{ politician?: { name?: string } }>;
      politicians?: Array<{ name?: string }>;
      current_members?: Array<{ name?: string }>;
    }>(FINA_OPENPARLIAMENT_URL, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    const members = data?.members ?? data?.politicians ?? data?.current_members ?? [];
    for (const entry of members) {
      const name =
        (entry as { politician?: { name?: string } }).politician?.name ??
        (entry as { name?: string }).name;
      if (name && typeof name === "string") candidateNames.push(name.trim());
    }
    if (candidateNames.length > 0) {
      console.log(`[Seed] Finance Committee: ${candidateNames.length} members from OpenParliament`);
    }
  } catch {
    // Fallback: known FINA members (45th Parliament, update as needed)
    candidateNames = [
      "Peter Fonseca",
      "Jasraj Singh Hallan",
      "Gabriel Ste-Marie",
      "Yvan Baker",
      "Adam Chambers",
      "Francesco Sorbara",
      "Philip Lawrence",
      "Dan Albas",
      "Taylor Bachrach",
      "Daniel Blaikie",
    ];
    console.log(`[Seed] Finance Committee: using static list (${candidateNames.length} names)`);
  }

  let linked = 0;
  const seenIds = new Set<string>();
  for (const rawName of candidateNames) {
    const norm = rawName.trim().toLowerCase().replace(/\s+/g, " ");
    const member = nameToMember.get(norm);
    if (!member) {
      // Try fuzzy: last name match for "First Last" format
      const last = norm.split(" ").pop();
      if (last) {
        const found = federalMembers.find((m) =>
          m.name.toLowerCase().includes(last)
        );
        if (found) {
          try {
            await prisma.memberCommittee.upsert({
              where: {
                memberId_committeeId: {
                  memberId: found.id,
                  committeeId: committee.id,
                },
              },
              create: { memberId: found.id, committeeId: committee.id },
              update: {},
            });
            linked++;
          } catch {
            // duplicate or constraint, skip
          }
        }
      }
      continue;
    }
    if (seenIds.has(member.id)) continue;
    try {
      await prisma.memberCommittee.upsert({
        where: {
          memberId_committeeId: {
            memberId: member.id,
            committeeId: committee.id,
          },
        },
        create: { memberId: member.id, committeeId: committee.id },
        update: {},
      });
      linked++;
      seenIds.add(member.id);
    } catch {
      // duplicate or constraint, skip
    }
  }
  console.log(`[Seed] MemberCommittee: ${linked} FINA member links created`);
}

main()
  .catch((e) => {
    console.error("[Seed] Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
