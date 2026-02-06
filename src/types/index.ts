/**
 * Global types aligned with Prisma / Supabase schema.
 * Use these for API responses and data props.
 */

// ----- Prisma / DB entities -----

export interface Member {
  id: string;
  name: string;
  riding: string;
  party: string;
  jurisdiction: string;
  disclosures?: Disclosure[];
  tradeTickers?: TradeTicker[];
}

export interface Disclosure {
  id: number;
  category: string;
  description: string;
  memberId: string;
}

export interface TradeTicker {
  id: number;
  symbol: string;
  type: "BUY" | "SELL";
  date: string; // ISO date from DB
  memberId: string;
  member?: Member;
}

/** Alias for API usage */
export type Trade = TradeTicker;

export interface Bill {
  id: number;
  number: string;
  status: string;
  title: string | null;
  keyVote: boolean;
}

export interface StockPriceCache {
  symbol: string;
  price: number;
  dailyChange: number;
  updatedAt: string;
}

export interface AppStatus {
  id: number;
  lastSuccessfulSyncAt: string | null;
}

// ----- Composite / view types for Member Profile UI -----

export type Jurisdiction = "FEDERAL" | "PROVINCIAL";

export interface MemberProfile {
  id: string;
  name: string;
  riding: string;
  jurisdiction: Jurisdiction;
  party: string;
  executiveSummary: {
    attendancePercent: number;
    integrityScore: number;
  };
  assets: Asset[];
  legislativeHistory: VoteRecord[];
  industryDistribution: IndustryShare[];
  preOfficeAssets?: Asset[];
}

export interface Asset {
  id: string;
  type: "Stocks" | "Real Estate" | "Trusts" | "Other";
  description: string;
  industryTags: string[];
  estimatedValue?: string;
  disclosureDate: string;
}

export interface VoteRecord {
  id: string;
  billId: string;
  billTitle: string;
  vote: "Yea" | "Nay" | "Abstained";
  date: string;
  outcome: string;
}

export interface IndustryShare {
  sector: string;
  percentage: number;
  value: number;
}
