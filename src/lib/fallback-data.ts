/**
 * Minimal fallback data for when real data is unavailable.
 * Replaces mock-data.ts with lightweight implementations.
 */

import type { MemberProfile, Jurisdiction } from "@/types";

export interface LobbyistMeeting {
  industry: string;
  meetingCount: number;
}

export interface BillSummary {
  billId: string;
  title: string;
  plainLanguage: string;
  publicInterestPoints: string[];
  corporateInterestPoints: string[];
}

/** Fallback member profile when DB lookup fails. */
export function getMemberProfile(ridingId: string): MemberProfile {
  const id = ridingId.toLowerCase().replace(/\s+/g, "-");
  const jurisdiction: Jurisdiction = id.includes("ontario") ? "PROVINCIAL" : "FEDERAL";

  return {
    id,
    name: "Member Not Found",
    riding: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    jurisdiction,
    party: "Unknown",
    executiveSummary: {
      attendancePercent: 0,
      integrityScore: 0,
    },
    assets: [],
    legislativeHistory: [],
    industryDistribution: [],
    preOfficeAssets: [],
  };
}

/** Fallback bill summary when real data unavailable. */
export function getBillSummary(billId: string): BillSummary | undefined {
  // Return undefined - let callers handle fallback
  return undefined;
}

/** Mock lobbyist heatmap data for analytics page. */
export const LOBBYIST_HEATMAP_DATA: LobbyistMeeting[] = [
  { industry: "Oil & Gas", meetingCount: 47 },
  { industry: "Pharmaceuticals", meetingCount: 42 },
  { industry: "Telecommunications", meetingCount: 38 },
  { industry: "Banking & Finance", meetingCount: 35 },
  { industry: "Real Estate", meetingCount: 31 },
  { industry: "Technology", meetingCount: 28 },
  { industry: "Mining", meetingCount: 24 },
  { industry: "Transportation", meetingCount: 21 },
  { industry: "Agriculture", meetingCount: 18 },
  { industry: "Retail", meetingCount: 15 },
];
