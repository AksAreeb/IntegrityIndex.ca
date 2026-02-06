/**
 * The Pulse — Automated Conflict Auditor
 * Maps Parliamentary Committees to Economic Sectors and flags High-Risk Conflicts
 * when MPs hold assets in sectors they legislate on.
 */

import { prisma } from "@/lib/db";

/** Parliamentary Committee name → Economic Sector(s) for conflict detection. */
export const COMMITTEE_TO_SECTOR: Record<string, string[]> = {
  Finance: ["Banking/Fintech", "Financial Services"],
  "Natural Resources": ["Oil/Gas/Mining", "Energy", "Natural Resources"],
  "Environment and Sustainable Development": ["Oil/Gas/Mining", "Energy", "Environment"],
  Environment: ["Oil/Gas/Mining", "Energy", "Environment"],
  "Industry and Technology": ["Technology", "Banking/Fintech", "Telecommunications"],
  Industry: ["Technology", "Banking/Fintech", "Energy"],
  "Transport, Infrastructure and Communities": ["Rail", "Transportation", "Construction"],
  Transport: ["Rail", "Transportation"],
  Health: ["Healthcare", "Pharma"],
  "Agriculture and Agri-Food": ["Agriculture", "Agribusiness"],
  "Public Safety": ["Defence", "Security"],
  "Fisheries and Oceans": ["Fisheries", "Marine"],
  Housing: ["Real Estate", "Real Estate/Development"],
  "Municipal Affairs and Housing": ["Real Estate", "Real Estate/Development"],
};

/** Ticker symbol or company name (lowercase) → Economic Sector. */
export const ASSET_TO_SECTOR: Record<string, string> = {
  // Oil/Gas/Mining
  su: "Oil/Gas/Mining",
  suncor: "Oil/Gas/Mining",
  cnq: "Oil/Gas/Mining",
  cenovus: "Oil/Gas/Mining",
  enb: "Oil/Gas/Mining",
  enbridge: "Oil/Gas/Mining",
  trp: "Oil/Gas/Mining",
  tcenergy: "Oil/Gas/Mining",
  ovv: "Oil/Gas/Mining",
  ico: "Oil/Gas/Mining",
  // Banking/Fintech
  td: "Banking/Fintech",
  ry: "Banking/Fintech",
  bns: "Banking/Fintech",
  bmo: "Banking/Fintech",
  cm: "Banking/Fintech",
  shop: "Banking/Fintech",
  shopify: "Banking/Fintech",
  // Rail / Transport
  cnr: "Rail",
  cp: "Rail",
  cpr: "Rail",
  cn: "Rail",
  // Real Estate / Housing
  rental: "Real Estate/Development",
  property: "Real Estate/Development",
  "real estate": "Real Estate/Development",
};

/** Bill title keywords → Committee label for conflict badges. */
const BILL_KEYWORD_TO_COMMITTEE: Record<string, string> = {
  finance: "Finance",
  banking: "Finance",
  budget: "Finance",
  tax: "Finance",
  environment: "Environment",
  carbon: "Environment",
  climate: "Environment",
  oil: "Natural Resources",
  energy: "Natural Resources",
  gas: "Natural Resources",
  mining: "Natural Resources",
  rail: "Transport",
  transport: "Transport",
  infrastructure: "Transport",
  health: "Health",
  pharma: "Health",
  tech: "Industry and Technology",
  digital: "Industry and Technology",
  streaming: "Industry and Technology",
  agriculture: "Agriculture and Agri-Food",
  housing: "Municipal Affairs and Housing",
  municipal: "Municipal Affairs and Housing",
};

export interface ConflictFlag {
  /** e.g. "Environment", "Finance" */
  committee: string;
  /** e.g. "Suncor Energy", "SU" */
  asset: string;
  /** Human-readable reason for badge */
  conflictReason: string;
  /** Disclosure or TradeTicker id for reference */
  disclosureId?: number;
  tradeTickerId?: number;
  /** Sector that matched */
  sector: string;
}

function getCommitteeFromBillTitle(title: string | null): string | null {
  const t = (title ?? "").toLowerCase();
  for (const [kw, committee] of Object.entries(BILL_KEYWORD_TO_COMMITTEE)) {
    if (t.includes(kw)) return committee;
  }
  return null;
}

function getSectorForAsset(description: string, symbol?: string): string | null {
  const d = description.trim().toLowerCase();
  const s = (symbol ?? "").trim().toLowerCase();
  if (s && ASSET_TO_SECTOR[s]) return ASSET_TO_SECTOR[s];
  for (const [key, sector] of Object.entries(ASSET_TO_SECTOR)) {
    if (d.includes(key)) return sector;
  }
  return null;
}

/** Returns committees derived from active bills (proxy for legislative areas). */
function getActiveCommitteesFromBills(bills: { title: string | null }[]): Set<string> {
  const committees = new Set<string>();
  for (const b of bills) {
    const committee = getCommitteeFromBillTitle(b.title);
    if (committee) committees.add(committee);
  }
  return committees;
}

/** Finds committee that oversees the given asset sector (if any). */
function matchSectorToCommittee(
  assetSector: string,
  activeCommittees: Set<string>
): string | null {
  const lower = assetSector.toLowerCase();
  for (const committee of activeCommittees) {
    const sectors = COMMITTEE_TO_SECTOR[committee];
    if (!sectors) continue;
    const matches = sectors.some(
      (s) =>
        s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase())
    );
    if (matches) return committee;
  }
  for (const [committee, sectors] of Object.entries(COMMITTEE_TO_SECTOR)) {
    if (
      sectors.some(
        (s) =>
          s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase())
      )
    ) {
      return committee;
    }
  }
  return null;
}

/**
 * Fetches an MP's active committees (via bills) and latest disclosures.
 * Flags disclosures as High-Risk Conflict when the member holds assets
 * in a sector they are currently legislating on.
 */
export async function checkConflict(memberId: string): Promise<{
  hasConflict: boolean;
  conflicts: ConflictFlag[];
}> {
  const [member, bills] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: {
        disclosures: {
          orderBy: { id: "desc" },
          take: 50,
          select: { id: true, description: true, category: true },
        },
        tradeTickers: {
          orderBy: { date: "desc" },
          take: 50,
          select: { id: true, symbol: true, type: true, date: true },
        },
      },
    }),
    prisma.bill.findMany({ take: 100, select: { title: true } }),
  ]);

  if (!member) {
    return { hasConflict: false, conflicts: [] };
  }

  const activeCommittees = getActiveCommitteesFromBills(bills);
  if (activeCommittees.size === 0) {
    activeCommittees.add("Finance");
    activeCommittees.add("Natural Resources");
    activeCommittees.add("Environment");
    activeCommittees.add("Industry and Technology");
  }

  const conflicts: ConflictFlag[] = [];
  const seen = new Set<string>();

  for (const d of member.disclosures) {
    const sector = getSectorForAsset(d.description);
    if (!sector) continue;
    const committee =
      matchSectorToCommittee(sector, activeCommittees) ??
      (COMMITTEE_TO_SECTOR["Natural Resources"]?.includes(sector)
        ? "Natural Resources"
        : null) ??
      (COMMITTEE_TO_SECTOR["Finance"]?.includes(sector) ? "Finance" : null) ??
      (COMMITTEE_TO_SECTOR["Environment"]?.includes(sector) ? "Environment" : null);
    if (!committee) continue;
    const key = `${committee}::${d.description}::${d.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    conflicts.push({
      committee,
      asset: d.description,
      conflictReason: `Committee: ${committee} | Asset: ${d.description}`,
      disclosureId: d.id,
      sector,
    });
  }

  for (const t of member.tradeTickers) {
    const sector = getSectorForAsset(t.symbol, t.symbol);
    if (!sector) continue;
    const committee =
      matchSectorToCommittee(sector, activeCommittees) ??
      (COMMITTEE_TO_SECTOR["Natural Resources"]?.includes(sector)
        ? "Natural Resources"
        : null) ??
      (COMMITTEE_TO_SECTOR["Finance"]?.includes(sector) ? "Finance" : null) ??
      (COMMITTEE_TO_SECTOR["Environment"]?.includes(sector) ? "Environment" : null);
    if (!committee) continue;
    const key = `${committee}::${t.symbol}::trade-${t.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    conflicts.push({
      committee,
      asset: t.symbol,
      conflictReason: `Committee: ${committee} | Asset: ${t.symbol}`,
      tradeTickerId: t.id,
      sector,
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
