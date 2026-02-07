/**
 * Integrity Audit — High-Trust verification for IntegrityIndex.ca
 * Verifies every Prisma model for data presence and consistency.
 * Used by scripts/verify-sync.ts (CLI) and /api/admin/system-check (Super Sync report).
 */

import { prisma } from "@/lib/prisma";
import { fetchLegisinfoOverview } from "@/lib/api/legisinfo";

const FEDERAL_MIN = 343;
const ONTARIO_MPP_MIN = 124;
const TOTAL_MEMBER_MIN = 443;

export interface VerificationResult {
  model: string;
  ok: boolean;
  detail: string;
  count?: number;
  expected?: number;
  issues?: string[];
}

export interface VerifySyncReport {
  ok: boolean;
  timestamp: string;
  results: VerificationResult[];
  summary: string;
}

async function verifyMember(): Promise<VerificationResult> {
  const [federalCount, provincialCount, totalCount, missingPhoto, missingSlug] =
    await Promise.all([
      prisma.member.count({ where: { jurisdiction: "FEDERAL" } }),
      prisma.member.count({ where: { jurisdiction: "PROVINCIAL" } }),
      prisma.member.count(),
      prisma.member.count({ where: { OR: [{ photoUrl: null }, { photoUrl: "" }] } }),
      prisma.member.count({ where: { OR: [{ slug: null }, { slug: "" }] } }),
    ]);

  const issues: string[] = [];
  if (federalCount < FEDERAL_MIN)
    issues.push(`Federal count ${federalCount} < ${FEDERAL_MIN} (45th Parliament target)`);
  if (provincialCount < ONTARIO_MPP_MIN)
    issues.push(`Provincial count ${provincialCount} < ${ONTARIO_MPP_MIN} (Ontario target)`);
  if (totalCount <= TOTAL_MEMBER_MIN)
    issues.push(`Total count ${totalCount} <= ${TOTAL_MEMBER_MIN} (expected > ${TOTAL_MEMBER_MIN})`);
  if (missingPhoto > 0) issues.push(`${missingPhoto} member(s) missing photoUrl`);
  if (missingSlug > 0) issues.push(`${missingSlug} member(s) missing slug`);

  return {
    model: "Member",
    ok: issues.length === 0,
    detail: `Federal: ${federalCount}, Provincial: ${provincialCount}, Total: ${totalCount}`,
    count: totalCount,
    expected: FEDERAL_MIN + ONTARIO_MPP_MIN,
    issues: issues.length > 0 ? issues : undefined,
  };
}

async function verifyBill(): Promise<VerificationResult> {
  let expectedCount = 0;
  try {
    const bills = await fetchLegisinfoOverview();
    expectedCount = bills.length;
  } catch (e) {
    return {
      model: "Bill",
      ok: false,
      detail: `Could not fetch LEGISinfo overview: ${e instanceof Error ? e.message : "unknown"}`,
      issues: ["LEGISinfo API unreachable"],
    };
  }

  const dbCount = await prisma.bill.count();
  const ok = dbCount >= expectedCount;

  return {
    model: "Bill",
    ok,
    detail: `DB: ${dbCount}, LEGISinfo session: ${expectedCount}`,
    count: dbCount,
    expected: expectedCount,
    issues: !ok
      ? [`Bill count ${dbCount} does not match session list (${expectedCount})`]
      : undefined,
  };
}

async function verifyDisclosure(): Promise<VerificationResult> {
  const [totalDisclosures, membersWithDisclosures, totalMembers] = await Promise.all([
    prisma.disclosure.count(),
    prisma.member.count({
      where: { disclosures: { some: {} } },
    }),
    prisma.member.count(),
  ]);

  const emptyFilingCount = totalMembers - membersWithDisclosures;
  // Every member has either ≥1 disclosure OR Empty Filing (0) — both valid; no failure for empty filings
  const ok = true;

  return {
    model: "Disclosure",
    ok,
    detail: `${totalDisclosures} disclosures; ${membersWithDisclosures} members with filings; ${emptyFilingCount} Empty Filing`,
    count: totalDisclosures,
  };
}

async function verifyConflictFlag(): Promise<VerificationResult> {
  const [totalDisclosures, membersWithIntegrityRank, totalMembers] = await Promise.all([
    prisma.disclosure.count(),
    prisma.member.count({ where: { integrityRank: { not: null } } }),
    prisma.member.count(),
  ]);

  // conflictFlag is Boolean @default(false) — Prisma schema guarantees no nulls
  const allProcessed = membersWithIntegrityRank === totalMembers;
  const issues: string[] = [];
  if (!allProcessed) {
    const unprocessed = totalMembers - membersWithIntegrityRank;
    issues.push(`The Pulse has not processed ${unprocessed} member(s) — missing integrityRank`);
  }

  return {
    model: "ConflictFlag",
    ok: allProcessed,
    detail: `${totalDisclosures} disclosures; ${membersWithIntegrityRank}/${totalMembers} members processed by The Pulse`,
    count: totalDisclosures,
    issues: issues.length > 0 ? issues : undefined,
  };
}

async function verifySector(): Promise<VerificationResult> {
  const count = await prisma.sector.count();
  const ok = count >= 11;
  return {
    model: "Sector",
    ok,
    detail: `${count} sectors (expected 11 GICS)`,
    count,
    expected: 11,
  };
}

async function verifyCommittee(): Promise<VerificationResult> {
  const count = await prisma.committee.count();
  const ok = count > 0;
  return {
    model: "Committee",
    ok,
    detail: `${count} committee(s)`,
    count,
  };
}

async function verifyOtherModels(): Promise<VerificationResult[]> {
  const [riding, tradeTicker, assetMapping, memberCommittee] = await Promise.all([
    prisma.riding.count(),
    prisma.tradeTicker.count(),
    prisma.assetSectorMapping.count(),
    prisma.memberCommittee.count(),
  ]);

  return [
    { model: "Riding", ok: riding > 0, detail: `${riding} ridings`, count: riding },
    { model: "TradeTicker", ok: true, detail: `${tradeTicker} trade tickers`, count: tradeTicker },
    { model: "AssetSectorMapping", ok: assetMapping > 0, detail: `${assetMapping} mappings`, count: assetMapping },
    { model: "MemberCommittee", ok: true, detail: `${memberCommittee} member-committee links`, count: memberCommittee },
  ];
}

export async function runVerifySync(): Promise<VerifySyncReport> {
  const results: VerificationResult[] = [];

  results.push(await verifyMember());
  results.push(await verifyBill());
  results.push(await verifyDisclosure());
  results.push(await verifyConflictFlag());
  results.push(await verifySector());
  results.push(await verifyCommittee());
  results.push(...(await verifyOtherModels()));

  const ok = results.every((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  return {
    ok,
    timestamp: new Date().toISOString(),
    results,
    summary: ok
      ? "All integrity checks passed."
      : `Failed: ${failed.map((f) => f.model).join(", ")}`,
  };
}
