import { prisma } from "@/lib/prisma";
import { resolveSectorForAsset } from "@/lib/sector-resolver";

/** Re-export The Pulse conflict auditor for use across the app. */
export { checkConflict, COMMITTEE_TO_SECTOR, ASSET_TO_SECTOR } from "@/lib/conflict-audit";
import { checkConflict } from "@/lib/conflict-audit";
import {
  scrapeCIEC,
  getMemberPhotoUrl as getFederalPhotoUrl,
  looksLikeTickerSymbol,
} from "@/lib/scrapers/ciecScraper";
import { getLiveStockPrice } from "@/lib/api/stocks";
import { syncBillsToDatabase } from "@/lib/api/legisinfo";
import { setLastSuccessfulSync } from "@/lib/admin-health";
import { fetchFederalMembers } from "@/lib/sync";
import { fetchOntarioMpps } from "@/lib/scrapers/ontario";
import { slugFromName } from "@/lib/slug";
import { syncMemberCommittees } from "@/lib/sync-member-committees";
import { backfillSlugsForMembers } from "@/lib/db-utils";

const FEDERAL_TARGET = 343;
const ONTARIO_MPP_TARGET = 124;

/** Days between two dates. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/** Conflict count for penalty calculation. */
type ConflictCount = number;

/**
 * Central Integrity Rank: Start at 100.
 * Subtract 0.5 per average day between trade/disclosure date and when disclosed.
 * Subtract 10 per active High-Risk conflict flag.
 * Pass preComputedConflictCount to avoid re-calling checkConflict (e.g. in sync).
 */
export async function calculateIntegrityRank(
  memberId: string,
  preComputedConflictCount?: ConflictCount
): Promise<number> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      disclosures: {
        select: { disclosureDate: true, createdAt: true },
      },
    },
  });
  if (!member) return 0;

  let avgDelayDays = 0;
  const delays: number[] = [];
  for (const d of member.disclosures) {
    const discDate = d.disclosureDate ?? d.createdAt;
    const delay = daysBetween(discDate, d.createdAt);
    if (delay > 0) delays.push(delay);
  }
  if (delays.length > 0) {
    avgDelayDays = delays.reduce((a, b) => a + b, 0) / delays.length;
  }

  const conflictCount =
    preComputedConflictCount ?? (await checkConflict(memberId)).conflicts.length;
  const conflictPenalty = conflictCount * 10;

  let rank = 100 - avgDelayDays * 0.5 - conflictPenalty;
  return Math.max(0, Math.min(100, Math.round(rank * 10) / 10));
}
/** OLA CDN 2026 path for MPP photos (member/profile-photo). */
const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/member/profile-photo";
const BATCH_SIZE = 10;
const TIME_LIMIT_MS = 50_000;

/** Ensure value is never "(not available)" or empty so Prisma does not receive invalid data. */
function normalizeMemberField(value: string | null | undefined, defaultVal: string): string {
  const s = (value ?? "").trim();
  if (!s || s === "(not available)" || s.toLowerCase() === "(not available)") return defaultVal;
  return s;
}

export type SyncResultStep = { step: string; ok: boolean; detail?: string };

export type RunScraperSyncResult = {
  ok: boolean;
  audit: string;
  results: SyncResultStep[];
};

export type RunScraperSyncOptions = {
  /** When true, no early exit on time limit (for admin Super Sync). */
  noTimeLimit?: boolean;
};

/**
 * Runs the full institutional audit sync:
 * A) CIEC scraper -> Disclosure + TradeTicker
 * B) Finnhub latest prices
 * C&D) LEGISinfo bills
 * E) Roster audit (Federal MPs + Ontario MPPs)
 * F) Integrity Rank + Conflict flags (The Pulse)
 */
export async function runScraperSync(options?: RunScraperSyncOptions): Promise<RunScraperSyncResult> {
  const startTime = Date.now();
  const timeLimit = options?.noTimeLimit ? Infinity : TIME_LIMIT_MS;
  const results: SyncResultStep[] = [];

  // Step A: CIEC scraper — disclosures + Material Change -> TradeTicker (date_disclosed)
  try {
    const sampleMembers = await prisma.member.findMany({
      take: 5,
      select: { id: true },
    });
    let tradeTickersCreated = 0;
    for (const m of sampleMembers) {
      if (Date.now() - startTime > timeLimit) {
        console.log("Time limit approaching, saving partial progress");
        break;
      }
      const rows = await scrapeCIEC(m.id);
      for (const row of rows.slice(0, 3)) {
        const category = normalizeMemberField(row.natureOfInterest, "Other").slice(0, 50);
        const description = normalizeMemberField(row.assetName, "").slice(0, 500) || "—";
        const sectorId = await resolveSectorForAsset(
          description,
          /^[A-Z]{1,5}$/i.test(description.trim()) ? description.trim() : undefined
        ).catch(() => null);
        await prisma.disclosure
          .create({
            data: {
              memberId: m.id,
              category,
              description,
              sectorId: sectorId ?? undefined,
            },
          })
          .catch(() => {});

        if (row.isMaterialChange && row.date_disclosed && looksLikeTickerSymbol(row.assetName ?? "")) {
          const symbol = (row.assetName ?? "").trim().toUpperCase();
          const disclosureDate = new Date(row.date_disclosed + "T12:00:00Z");
          if (!Number.isNaN(disclosureDate.getTime())) {
            await prisma.tradeTicker.create({
              data: {
                memberId: m.id,
                symbol,
                type: "BUY",
                date: disclosureDate,
              },
            }).then(() => { tradeTickersCreated += 1; }).catch(() => {});
          }
        }
      }
    }
    results.push({ step: "A_CIEC", ok: true, detail: tradeTickersCreated ? `${tradeTickersCreated} trade(s) from material changes` : undefined });
  } catch (e) {
    results.push({
      step: "A_CIEC",
      ok: false,
      detail: e instanceof Error ? e.message : "CIEC scrape failed",
    });
  }

  // Step B: Finnhub latest prices for TradeTicker symbols (no DB store)
  try {
    const symbols = await prisma.tradeTicker.findMany({
      select: { symbol: true },
      distinct: ["symbol"],
      take: 20,
    });
    for (const { symbol } of symbols) {
      await getLiveStockPrice(symbol);
    }
    results.push({ step: "B_Finnhub", ok: true });
  } catch (e) {
    results.push({
      step: "B_Finnhub",
      ok: false,
      detail: e instanceof Error ? e.message : "Finnhub failed",
    });
  }

  // Step C & D: LEGISinfo XML -> parse Status/Number/Title -> upsert Bill
  try {
    const { count } = await syncBillsToDatabase();
    results.push({ step: "C_D_LEGISinfo_Bills", ok: true, detail: `${count} bills` });
  } catch (e) {
    results.push({
      step: "C_D_LEGISinfo_Bills",
      ok: false,
      detail: e instanceof Error ? e.message : "LEGISinfo failed",
    });
  }

  // Step E: Roster audit — ensure 343 Federal MPs and 124 Ontario MPPs; fetch and upsert in batches
  try {
    const [federalCount, provincialCount] = await Promise.all([
      prisma.member.count({ where: { jurisdiction: "FEDERAL" } }),
      prisma.member.count({ where: { jurisdiction: "PROVINCIAL" } }),
    ]);
    if (federalCount < FEDERAL_TARGET) {
      const federal = await fetchFederalMembers();
      let federalUpserted = 0;
      for (let i = 0; i < federal.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > timeLimit) {
          console.log("Time limit approaching, saving partial progress");
          break;
        }
        const batch = federal.slice(i, i + BATCH_SIZE);
        for (const mp of batch) {
          const name = normalizeMemberField(mp.name, "Unknown");
          const riding = normalizeMemberField(mp.riding, "Unknown");
          const party = normalizeMemberField(mp.party, "Independent");
          await prisma.member
            .upsert({
              where: { id: mp.id },
              create: {
                id: mp.id,
                name,
                riding,
                party,
                jurisdiction: "FEDERAL",
                chamber: "House of Commons",
                photoUrl: getFederalPhotoUrl(mp.id),
              },
              update: { name, riding, party, photoUrl: getFederalPhotoUrl(mp.id) },
            })
            .then(() => { federalUpserted += 1; })
            .catch((err) => console.warn("[sync-engine] Federal member upsert failed:", mp.id, err));
        }
      }
      results.push({
        step: "E_Roster_Federal",
        ok: true,
        detail: federalUpserted < federal.length
          ? `${federalUpserted} federal MPs upserted (time limit; target ${FEDERAL_TARGET})`
          : `${federalUpserted} federal MPs (target ${FEDERAL_TARGET})`,
      });
    } else {
      results.push({ step: "E_Roster_Federal", ok: true, detail: `already ${federalCount} federal` });
    }
    // Always run Provincial sync (never skip) to ensure current Ontario data
    let ontario: Awaited<ReturnType<typeof fetchOntarioMpps>> = [];
    try {
      ontario = await fetchOntarioMpps();
    } catch (ontarioErr) {
      console.warn("[sync-engine] Ontario MPP fetch failed (continuing without Ontario):", ontarioErr);
    }
    let ontarioUpserted = 0;
    for (let i = 0; i < ontario.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > timeLimit) {
        console.log("Time limit approaching, saving partial progress");
        break;
      }
      const batch = ontario.slice(i, i + BATCH_SIZE);
      for (const mpp of batch) {
        const name = normalizeMemberField(mpp.name, "Unknown");
        const riding = normalizeMemberField(mpp.riding, "Unknown");
        const party = normalizeMemberField(mpp.party, "Independent");
        const slug = slugFromName(name);
        const olaSlug = (mpp as { olaSlug?: string }).olaSlug ?? mpp.id.replace(/^ON-/, "");
        const photoUrl =
          (mpp as { imageUrl?: string }).imageUrl?.trim() ||
          `${OLA_MPP_PHOTO_BASE}/${olaSlug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("_")}.jpg`;
        await prisma.member
          .upsert({
            where: { id: mpp.id },
            create: {
              id: mpp.id,
              name,
              riding,
              party,
              jurisdiction: "PROVINCIAL",
              chamber: "Legislative Assembly",
              photoUrl,
              slug,
            },
            update: { name, riding, party, photoUrl, slug },
          })
          .then(() => { ontarioUpserted += 1; })
          .catch((err) => console.warn("[sync-engine] Ontario MPP upsert failed:", mpp.id, err));
      }
    }
    results.push({
      step: "E_Roster_Ontario",
      ok: ontario.length > 0,
      detail: ontarioUpserted < ontario.length
        ? `${ontarioUpserted} Ontario MPPs upserted (time limit; target ${ONTARIO_MPP_TARGET})`
        : `${ontarioUpserted} Ontario MPPs (target ${ONTARIO_MPP_TARGET})`,
    });
  } catch (e) {
    results.push({
      step: "E_Roster",
      ok: false,
      detail: e instanceof Error ? e.message : "Roster fetch failed",
    });
  }

    // Step E1.5: Backfill missing slugs for all members
    try {
      const { updated } = await backfillSlugsForMembers();
      if (updated > 0) {
        results.push({ step: "E1.5_BackfillSlugs", ok: true, detail: `${updated} slugs backfilled` });
      }
    } catch {
      /* non-fatal */
    }

    // Step E2: MemberCommittee links (required for The Pulse conflict detection)
  try {
    const committeeLinks = await syncMemberCommittees();
    results.push({
      step: "E2_MemberCommittee",
      ok: true,
      detail: `${committeeLinks} MemberCommittee links synced`,
    });
  } catch (e) {
    results.push({
      step: "E2_MemberCommittee",
      ok: false,
      detail: e instanceof Error ? e.message : "MemberCommittee sync failed",
    });
  }

  // Step F: Integrity Rank + Conflict flags — run for ALL members (no time limit)
  try {
    await prisma.disclosure.updateMany({
      data: { conflictFlag: false, conflictReason: null },
    });
    const members = await prisma.member.findMany({ select: { id: true } });
    let updated = 0;
    for (const m of members) {
      const { conflicts } = await checkConflict(m.id);
      for (const c of conflicts) {
        if (c.disclosureId != null) {
          await prisma.disclosure.update({
            where: { id: c.disclosureId },
            data: { conflictFlag: true, conflictReason: c.conflictReason },
          });
        }
      }
      const rank = await calculateIntegrityRank(m.id, conflicts.length);
      await prisma.member.update({
        where: { id: m.id },
        data: { integrityRank: rank },
      });
      updated += 1;
    }
    results.push({
      step: "F_IntegrityRank",
      ok: true,
      detail: `${updated} members updated (integrity rank + conflict flags)`,
    });
  } catch (e) {
    results.push({
      step: "F_IntegrityRank",
      ok: false,
      detail: e instanceof Error ? e.message : "Integrity rank sync failed",
    });
  }

  if (results.every((r) => r.ok)) {
    await setLastSuccessfulSync();
  }

  return {
    ok: results.every((r) => r.ok),
    audit: "Institutional Audit",
    results,
  };
}
