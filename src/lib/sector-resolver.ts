/**
 * Resolves asset description/symbol to Sector ID for Disclosure linkage.
 * Used by sync-engine when saving disclosures.
 */
import { prisma } from "@/lib/db";

let _cache: Map<string, string> | null = null;

async function loadMappings(): Promise<Map<string, string>> {
  if (_cache) return _cache;
  const rows = await prisma.assetSectorMapping.findMany({
    select: { keyword: true, sectorId: true },
  });
  _cache = new Map(rows.map((r) => [r.keyword, r.sectorId]));
  return _cache;
}

/**
 * Returns sectorId if the asset description or symbol matches a mapping.
 */
export async function resolveSectorForAsset(
  description: string,
  symbol?: string
): Promise<string | null> {
  const mappings = await loadMappings();
  const d = (description ?? "").trim().toLowerCase();
  const s = (symbol ?? "").trim().toLowerCase();

  if (s && mappings.has(s)) return mappings.get(s)!;
  if (d && mappings.has(d)) return mappings.get(d)!;
  for (const [keyword, sectorId] of mappings) {
    if (d.includes(keyword)) return sectorId;
  }
  return null;
}

export function invalidateSectorCache(): void {
  _cache = null;
}
