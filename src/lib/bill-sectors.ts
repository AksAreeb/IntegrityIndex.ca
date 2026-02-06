/**
 * Maps bill title/summary keywords to stock sectors and tickers for conflict detection.
 * Used by /bills (server) and BillCardList (client).
 */

export const SECTOR_TICKERS: Record<string, string[]> = {
  streaming: ["SHOP"],
  news: ["SHOP"],
  digital: ["SHOP", "TD", "RY"],
  environment: ["ENB", "SU", "TRP", "CNQ"],
  carbon: ["ENB", "SU", "TRP", "CNQ"],
  oil: ["ENB", "SU", "TRP", "CNQ"],
  energy: ["ENB", "SU", "TRP", "CNQ", "CNR"],
  housing: ["SU"],
  health: [],
};

export function getLinkedTickers(text: string): string[] {
  const lower = (text ?? "").toLowerCase();
  const out: string[] = [];
  for (const [keyword, tickers] of Object.entries(SECTOR_TICKERS)) {
    if (lower.includes(keyword)) out.push(...tickers);
  }
  return [...new Set(out)];
}

export function getSectorImpact(text: string): string[] {
  const lower = (text ?? "").toLowerCase();
  const sectors: string[] = [];
  if (lower.includes("streaming") || lower.includes("digital")) sectors.push("Technology / Media");
  if (lower.includes("news")) sectors.push("Media");
  if (lower.includes("environment") || lower.includes("protection") || lower.includes("carbon") || lower.includes("oil")) sectors.push("Energy / Natural Resources");
  if (lower.includes("housing") || lower.includes("homes")) sectors.push("Real Estate / Development");
  if (lower.includes("carbon") || lower.includes("oil") || lower.includes("energy")) sectors.push("Energy");
  return sectors.length ? [...new Set(sectors)] : ["General"];
}
