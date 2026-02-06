/**
 * Idempotent seed: Federal MPs (OpenParliament) + Ontario MPPs (OLA).
 * Uses officialId (FED-*, ON-*) for upserts. Compatible with npx tsx prisma/seed.ts.
 */
import "dotenv/config";
import axios from "axios";
import { prisma } from '../src/lib/prisma';

const FEDERAL_API = "https://api.openparliament.ca/politicians/?format=json";
const ONTARIO_API = "https://represent.opennorth.ca/representatives/ontario-legislature/?format=json&limit=150";
const FETCH_TIMEOUT_MS = 20000;
const USER_AGENT = "IntegrityIndex.ca/1.0 (https://integrityindex.ca)";

interface FederalPolitician {
  name: string;
  url?: string;
  current_party?: { short_name?: { en?: string } };
  current_riding?: { name?: { en?: string }; province?: string };
}

interface OntarioMemberRow {
  id?: string | number;
  name?: string;
  riding?: string;
  party?: string;
  [key: string]: unknown;
}

function slugFromUrl(url: string): string {
  const path = url.replace(/\/$/, "").split("/").pop() ?? "";
  return path || "unknown";
}

function fetchFederalMps(): Promise<FederalPolitician[]> {
  return new Promise((resolve) => {
    const all: FederalPolitician[] = [];
    let offset = 0;
    const limit = 100;

    const fetchPage = async () => {
      try {
        const { data } = await axios.get<{
          objects?: FederalPolitician[];
          pagination?: { next_url?: string | null };
        }>(FEDERAL_API, {
          timeout: FETCH_TIMEOUT_MS,
          params: { limit, offset },
          headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
          validateStatus: (s) => s >= 200 && s < 400,
        });
        const objects = data?.objects ?? [];
        all.push(...objects);
        if (data?.pagination?.next_url && objects.length === limit) {
          offset += limit;
          await fetchPage();
        } else {
          resolve(all);
        }
      } catch (e) {
        console.warn("[Seed] Federal fetch failed:", e instanceof Error ? e.message : e);
        resolve(all);
      }
    };

    fetchPage();
  });
}

async function fetchOntarioMpps(): Promise<{ id: string; name: string; riding: string; party: string; photoUrl: string }[]> {
  const ONTARIO_API = "https://represent.opennorth.ca/representatives/ontario-legislature/?limit=150";

  try {
    console.log('[Seed] Fetching Ontario MPPs from Represent API (Open North)...');

    const { data } = await axios.get(ONTARIO_API, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });

    // Represent API standard: results are in the 'objects' array
    const raw = data?.objects || [];

    const result = [];
    const seen = new Set<string>();

    for (const m of raw) {
      const name = String(m.name || "").trim();
      const riding = String(m.district_name || "").trim();
      const party = String(m.party_name || "").trim();
      const photoUrl = m.photo_url || null;

      if (!name) continue;

      // Represent doesn't provide the OLA 'member_id', so we generate a 
      // stable slug based on the name for the officialId.
      const slug = `ON-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;

      if (seen.has(slug)) continue;
      seen.add(slug);

      result.push({
        id: slug, // Keep id and officialId consistent
        name,
        riding,
        party: party || "Independent",
        photoUrl
      });
    }

    console.log(`[Seed] Successfully processed ${result.length} Ontario MPPs.`);
    return result;
  } catch (e) {
    console.error("[Seed] Ontario fetch failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
async function main() {
  console.log("\n========== Seed: Federal MPs + Ontario MPPs (idempotent) ==========\n");

  let federalList: FederalPolitician[] = [];
  try {
    console.log("[Seed] Fetching Federal MPs from OpenParliament...");
    federalList = await fetchFederalMps();
    console.log(`[Seed]   → ${federalList.length} Federal politician(s) fetched.\n`);
  } catch (e) {
    console.warn("[Seed] Federal API error:", e instanceof Error ? e.message : e);
  }

  let ontarioList: { id: string; name: string; riding: string; party: string }[] = [];
  try {
    console.log("[Seed] Fetching Ontario MPPs from OLA...");
    ontarioList = await fetchOntarioMpps();
    console.log(`[Seed]   → ${ontarioList.length} Ontario MPP(s) fetched.\n`);
  } catch (e) {
    console.warn("[Seed] Ontario API error:", e instanceof Error ? e.message : e);
  }

  let fedUpserted = 0;
  for (const p of federalList) {
    const name = p.name?.trim() || "Unknown";
    const riding = p.current_riding?.name?.en?.trim() || p.current_riding?.name || "Unknown";
    const party = p.current_party?.short_name?.en?.trim() || "Independent";
    const urlSlug = p.url ? slugFromUrl(p.url) : null;
    const officialId = urlSlug ? `FED-${urlSlug}` : `FED-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${fedUpserted}`;
    try {
      await prisma.member.upsert({
        where: { officialId },
        create: {
          id: officialId,
          officialId,
          name,
          riding: String(riding).slice(0, 500),
          party: String(party).slice(0, 200),
          jurisdiction: "FEDERAL",
          chamber: "House of Commons",
        },
        update: {
          name,
          riding: String(riding).slice(0, 500),
          party: String(party).slice(0, 200),
        },
      });
      fedUpserted++;
    } catch (e) {
      console.warn(`[Seed]   Skip Federal ${name}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`[Seed] Federal MPs upserted: ${fedUpserted}.\n`);

  let onUpserted = 0;
  for (const m of ontarioList) {
    const officialId = `ON-${m.id}`;
    try {
      await prisma.member.upsert({
        where: { officialId },
        create: {
          id: officialId,
          officialId,
          name: m.name,
          riding: m.riding.slice(0, 500),
          party: m.party.slice(0, 200),
          jurisdiction: "PROVINCIAL",
          chamber: "Legislative Assembly",
        },
        update: {
          name: m.name,
          riding: m.riding.slice(0, 500),
          party: m.party.slice(0, 200),
        },
      });
      onUpserted++;
    } catch (e) {
      console.warn(`[Seed]   Skip Ontario ${m.name}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`[Seed] Ontario MPPs upserted: ${onUpserted}.\n`);

  const total = await prisma.member.count();
  console.log(`[Seed] Done. Total members in DB: ${total}.\n`);
}

main()
  .catch((e) => {
    console.error("[Seed] Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
