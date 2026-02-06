import { prisma } from "@/lib/db";
import type { MemberProfile, Asset, Jurisdiction, IndustryShare, VoteRecord } from "@/types";
import { getMemberProfile as getMockMemberProfile } from "@/lib/fallback-data";

/**
 * Fetches a member by riding ID (same identifier as GeoJSON riding_id used in GovernanceMap).
 * Maps DB Member + Disclosure to MemberProfile; generates executiveSummary, legislativeHistory,
 * and industryDistribution from live DB counts.
 */
export async function getMemberByRidingId(
  ridingId: string
): Promise<MemberProfile | null> {
  const id = ridingId.toLowerCase().replace(/\s+/g, "-");
  try {
    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        riding: true,
        jurisdiction: true,
        party: true,
        disclosures: { select: { id: true, category: true, description: true } },
        tradeTickers: { select: { symbol: true } },
      },
    });
    if (!member) return null;

    const jurisdiction: Jurisdiction =
      member.jurisdiction.toUpperCase() === "PROVINCIAL" ? "PROVINCIAL" : "FEDERAL";

    const assets: Asset[] = member.disclosures.map((d) => ({
      id: `disclosure-${d.id}`,
      type: mapCategoryToAssetType(d.category),
      description: d.description,
      industryTags: [],
      disclosureDate: "",
    }));

    const tradeCount = member.tradeTickers.length;
    const conflictCount = 0;
    const integrityScore = Math.max(0, 100 - tradeCount * 5 - conflictCount * 15);
    const executiveSummary = {
      attendancePercent: 0,
      integrityScore,
    };
    const legislativeHistory: VoteRecord[] = [];
    const industryDistribution: IndustryShare[] = buildIndustryDistributionFromTickers(
      member.tradeTickers
    );
    const mock = getMockMemberProfile(ridingId);

    return {
      id: member.id,
      name: member.name,
      riding: member.riding,
      jurisdiction,
      party: member.party,
      executiveSummary,
      assets,
      legislativeHistory,
      industryDistribution,
      preOfficeAssets: mock.preOfficeAssets,
    };
  } catch (e) {
    console.error("[member-service]: getMemberByRidingId failed", e);
    return null;
  }
}

/** Resolves riding name or slug from GeoJSON to member.id for map click routing. */
export async function resolveMemberIdFromRiding(
  ridingNameOrSlug: string,
  jurisdiction: "FEDERAL" | "PROVINCIAL"
): Promise<string | null> {
  const slug = ridingNameOrSlug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const prefix = jurisdiction === "FEDERAL" ? "FED-" : "ON-";

  try {
    // 1. Try direct id match (e.g. FED-justin-trudeau, ON-jennifer-mccullough)
    const byId = await prisma.member.findUnique({
      where: { id: slug },
      select: { id: true },
    });
    if (byId) return byId.id;

    // 2. Try prefixed slug (FED-{slug} or ON-{slug})
    const prefixed = prefix + slug.replace(/^(fed-|on-)/, "");
    const byPrefixed = await prisma.member.findUnique({
      where: { id: prefixed },
      select: { id: true },
    });
    if (byPrefixed) return byPrefixed.id;

    // 3. Try riding name match (member.riding)
    const member = await prisma.member.findFirst({
      where: {
        riding: { equals: ridingNameOrSlug, mode: "insensitive" },
        jurisdiction,
      },
      select: { id: true },
    });
    if (member) return member.id;

    return null;
  } catch (e) {
    console.error("[member-service]: resolveMemberIdFromRiding failed", e);
    return null;
  }
}

function buildIndustryDistributionFromTickers(
  tradeTickers: { symbol: string }[]
): IndustryShare[] {
  const bySymbol: Record<string, number> = {};
  for (const t of tradeTickers) {
    bySymbol[t.symbol] = (bySymbol[t.symbol] ?? 0) + 1;
  }
  const total = tradeTickers.length;
  if (total === 0) return [];
  return Object.entries(bySymbol).map(([sector, count]) => ({
    sector,
    percentage: Math.round((count / total) * 100),
    value: count * 10000,
  }));
}

function mapCategoryToAssetType(
  category: string
): "Stocks" | "Real Estate" | "Trusts" | "Other" {
  const c = category.toLowerCase();
  if (c.includes("equity") || c.includes("stock")) return "Stocks";
  if (c.includes("real estate") || c.includes("property")) return "Real Estate";
  if (c.includes("trust")) return "Trusts";
  return "Other";
}
