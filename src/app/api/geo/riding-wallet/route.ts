import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRidingWalletByPostalCode } from "@/lib/api/geo";
import { checkConflict } from "@/lib/conflict-audit";
import { ASSET_TO_SECTOR } from "@/lib/conflict-audit";

export const dynamic = "force-dynamic";

const CACHE_FINANCIAL = "private, no-store, max-age=0";

/** Extract sectors from disclosure descriptions and trade symbols. */
function getSectorsFromMember(
  disclosures: { description: string }[],
  trades: { symbol: string }[]
): string[] {
  const sectors = new Set<string>();
  const add = (desc: string, symbol?: string) => {
    const d = desc.trim().toLowerCase();
    const s = (symbol ?? "").trim().toLowerCase();
    if (s && ASSET_TO_SECTOR[s]) sectors.add(ASSET_TO_SECTOR[s]);
    for (const [key, sector] of Object.entries(ASSET_TO_SECTOR)) {
      if (d.includes(key)) sectors.add(sector);
    }
  };
  for (const d of disclosures) add(d.description);
  for (const t of trades) add(t.symbol, t.symbol);
  return [...sectors];
}

/** Integrity rank 1–100 based on disclosure filing speed (same logic as member page). */
function computeIntegrityRank(
  disclosures: { disclosureDate: Date | null; createdAt: Date }[]
): number {
  const withBoth = disclosures.filter(
    (d) => d.disclosureDate != null && d.createdAt != null
  );
  if (withBoth.length === 0) return 100;
  const delaysDays = withBoth.map((d) => {
    const created = new Date(d.createdAt).getTime();
    const disclosed = new Date(d.disclosureDate!).getTime();
    return (created - disclosed) / (24 * 60 * 60 * 1000);
  });
  const avgDelayDays = delaysDays.reduce((a, b) => a + b, 0) / delaysDays.length;
  const score = Math.round(100 - Math.min(100, avgDelayDays * 2));
  return Math.max(1, Math.min(100, score));
}

export interface RidingWalletResponse {
  postalCode: string;
  province: string;
  city?: string;
  federal: {
    memberId: string;
    name: string;
    riding: string;
    party: string;
    jurisdiction: string;
    photoUrl: string | null;
    integrityRank: number;
    disclosures: Array<{
      id: number;
      category: string;
      description: string;
      disclosureDate: string | null;
    }>;
    primarySectors: string[];
    estimatedNetWorth: string;
    pulseConflictFlags: Array<{
      committee: string;
      asset: string;
      conflictReason: string;
    }>;
  };
  provincial: {
    memberId: string;
    name: string;
    riding: string;
    party: string;
    jurisdiction: string;
    photoUrl: string | null;
    integrityRank: number;
    disclosures: Array<{
      id: number;
      category: string;
      description: string;
      disclosureDate: string | null;
    }>;
    primarySectors: string[];
    estimatedNetWorth: string;
    pulseConflictFlags: Array<{
      committee: string;
      asset: string;
      conflictReason: string;
    }>;
  } | null;
  aggregator: {
    combinedNetWorthEstimated: string;
    overlappingSectors: string[];
    ridingSectorConcentration: boolean;
    topIndustries: string[];
  };
  constituentAlerts: Array<{ memberId: string; message: string }>;
}

/**
 * GET /api/geo/riding-wallet?postalCode=M5V3A8
 *
 * Resolves Federal + Provincial ridings from postal code, fetches both MP and MPP,
 * their disclosures, primary sectors, Pulse conflict flags, and aggregator metrics.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postalCode =
    searchParams.get("postalCode") ??
    searchParams.get("postal") ??
    searchParams.get("code");
  if (!postalCode || typeof postalCode !== "string") {
    return NextResponse.json(
      { error: "Query param 'postalCode', 'postal', or 'code' required" },
      { status: 400 }
    );
  }

  try {
    const geo = await getRidingWalletByPostalCode(postalCode);
    if (!geo) {
      return NextResponse.json(
        { error: "No riding found for this postal code" },
        { status: 404, headers: { "Cache-Control": CACHE_FINANCIAL } }
      );
    }

    const federalSlug = geo.federal.ridingName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const federalMember = await prisma.member.findFirst({
      where: {
        jurisdiction: "FEDERAL",
        OR: [
          { id: geo.federal.ridingId },
          { id: federalSlug },
          { riding: geo.federal.ridingName },
        ],
      },
      select: {
        id: true,
        name: true,
        riding: true,
        party: true,
        jurisdiction: true,
        photoUrl: true,
        disclosures: {
          orderBy: { id: "desc" },
          take: 50,
          select: {
            id: true,
            category: true,
            description: true,
            disclosureDate: true,
            createdAt: true,
          },
        },
        tradeTickers: {
          select: { symbol: true },
        },
      },
    });

    if (!federalMember) {
      return NextResponse.json(
        { error: "No federal representative found for this riding" },
        { status: 404, headers: { "Cache-Control": CACHE_FINANCIAL } }
      );
    }

    let provincialMember: typeof federalMember | null = null;
    if (geo.province === "ON") {
      provincialMember = await prisma.member.findFirst({
        where: {
          jurisdiction: "PROVINCIAL",
          OR: geo.provincial
            ? [
                { id: geo.provincial.ridingId },
                {
                  id: geo.provincial.ridingName
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                },
                { riding: geo.provincial.ridingName },
              ]
            : [
                { riding: geo.federal.ridingName },
                { id: federalSlug },
              ],
        },
        select: {
          id: true,
          name: true,
          riding: true,
          party: true,
          jurisdiction: true,
          photoUrl: true,
          disclosures: {
            orderBy: { id: "desc" },
            take: 50,
            select: {
              id: true,
              category: true,
              description: true,
              disclosureDate: true,
              createdAt: true,
            },
          },
          tradeTickers: {
            select: { symbol: true },
          },
        },
      });
    }

    const [federalConflicts, provincialConflicts] = await Promise.all([
      checkConflict(federalMember.id),
      provincialMember ? checkConflict(provincialMember.id) : { conflicts: [] },
    ]);

    const federalSectors = getSectorsFromMember(
      federalMember.disclosures,
      federalMember.tradeTickers
    );
    const provincialSectors = provincialMember
      ? getSectorsFromMember(
          provincialMember.disclosures,
          provincialMember.tradeTickers
        )
      : [];
    const overlappingSectors = federalSectors.filter((s) =>
      provincialSectors.includes(s)
    );
    const ridingSectorConcentration = overlappingSectors.length > 0;
    const sectorCounts = new Map<string, number>();
    for (const s of federalSectors) sectorCounts.set(s, (sectorCounts.get(s) ?? 0) + 1);
    for (const s of provincialSectors) sectorCounts.set(s, (sectorCounts.get(s) ?? 0) + 1);
    const topIndustries = [...sectorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    const constituentAlerts: Array<{ memberId: string; message: string }> = [];
    if (provincialMember) {
      const housingCommitteeConflict = provincialConflicts.conflicts.some(
        (c) =>
          /housing|municipal|real estate/i.test(c.committee)
      );
      const rentalCount = provincialMember.disclosures.filter((d) => {
        const desc = (d.description ?? "").toLowerCase();
        return /rental|rent\b|property|real estate|investment property/i.test(desc);
      }).length;
      if (housingCommitteeConflict && rentalCount > 0) {
        constituentAlerts.push({
          memberId: provincialMember.id,
          message: `Constituent Alert: MPP on Housing-related committee holds ${rentalCount} disclosed rental or real estate asset${rentalCount > 1 ? "s" : ""}.`,
        });
      }
    }

    const disclosureCount =
      federalMember.disclosures.length +
      (provincialMember?.disclosures.length ?? 0);
    const assetCount =
      disclosureCount +
      federalMember.tradeTickers.length +
      (provincialMember?.tradeTickers.length ?? 0);
    const combinedEstimate =
      assetCount > 0
        ? `Based on ${assetCount} disclosed assets (disclosure counts; no dollar amounts available)`
        : "No disclosed assets on record";

    const formatMember = (
      m: typeof federalMember,
      conflicts: { conflicts: Array<{ committee: string; asset: string; conflictReason: string }> }
    ) => ({
      memberId: m.id,
      name: m.name,
      riding: m.riding,
      party: m.party,
      jurisdiction: m.jurisdiction,
      photoUrl: m.photoUrl,
      integrityRank: computeIntegrityRank(m.disclosures),
      disclosures: m.disclosures.map((d) => ({
        id: d.id,
        category: d.category,
        description: d.description,
        disclosureDate: d.disclosureDate?.toISOString().slice(0, 10) ?? null,
      })),
      primarySectors: getSectorsFromMember(m.disclosures, m.tradeTickers),
      estimatedNetWorth:
        m.disclosures.length + m.tradeTickers.length > 0
          ? `Based on ${m.disclosures.length + m.tradeTickers.length} disclosed assets`
          : "No disclosed assets on record",
      pulseConflictFlags: conflicts.conflicts.map((c) => ({
        committee: c.committee,
        asset: c.asset,
        conflictReason: c.conflictReason,
      })),
    });

    const response: RidingWalletResponse = {
      postalCode: postalCode.replace(/\s+/g, "").toUpperCase().slice(0, 6),
      province: geo.province,
      city: geo.city,
      federal: formatMember(federalMember, federalConflicts),
      provincial: provincialMember
        ? formatMember(provincialMember, provincialConflicts)
        : null,
      aggregator: {
        combinedNetWorthEstimated: combinedEstimate,
        overlappingSectors,
        ridingSectorConcentration,
        topIndustries,
      },
      constituentAlerts,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": CACHE_FINANCIAL },
    });
  } catch (e) {
    console.error("[riding-wallet]: GET failed", e);
    return NextResponse.json(
      { error: "Failed to resolve riding wallet" },
      { status: 500, headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  }
}
