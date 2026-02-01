import { prisma } from "@/lib/db";
import {
  getMemberProfile as getMockMemberProfile,
  type MemberProfile,
  type Asset,
  type Jurisdiction,
} from "@/lib/mock-data";

/**
 * Fetches a member by riding ID (same identifier as GeoJSON riding_id used in GovernanceMap).
 * Maps DB Member + Disclosure to MemberProfile; fills executiveSummary, legislativeHistory,
 * industryDistribution, preOfficeAssets from mock so the profile tabs render.
 */
export async function getMemberByRidingId(
  ridingId: string
): Promise<MemberProfile | null> {
  const id = ridingId.toLowerCase().replace(/\s+/g, "-");
  try {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        disclosures: true,
        tradeTickers: true,
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

    const mock = getMockMemberProfile(ridingId);
    return {
      id: member.id,
      name: member.name,
      riding: member.riding,
      jurisdiction,
      party: member.party,
      executiveSummary: mock.executiveSummary,
      assets,
      legislativeHistory: mock.legislativeHistory,
      industryDistribution: mock.industryDistribution,
      preOfficeAssets: mock.preOfficeAssets,
    };
  } catch {
    return null;
  }
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
