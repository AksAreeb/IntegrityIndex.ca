import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";
import { checkConflict } from "@/lib/conflict-audit";
import { AppShell } from "@/components/AppShell";
import { MemberDisclosureTable } from "./MemberDisclosureTable";
import { MemberTradeTable } from "./MemberTradeTable";
import { MemberPhoto } from "@/components/MemberPhoto";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jurisdiction?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { name: true, riding: true },
  });
  if (!member) return { title: "Member Not Found" };
  const canonical = `${SITE_URL}/member/${id}`;
  const { hasConflict } = await checkConflict(id);
  const baseMeta: Metadata = {
    title: hasConflict
      ? `Public Interest Audit: ${member.name} Conflict Analysis`
      : `${member.name} - Financial Integrity Profile`,
    description: hasConflict
      ? `Public Interest Audit: Conflict-of-interest analysis for ${member.name}, representing ${member.riding}. View flagged disclosures and committee overlaps.`
      : `View stock trades and conflict-of-interest audits for ${member.name}, representing ${member.riding}.`,
    alternates: { canonical },
  };
  if (hasConflict) {
    baseMeta.other = {
      "audit-type": "Public Interest Audit",
      "audit-subject": `${member.name} Conflict Analysis`,
    };
  }
  return baseMeta;
}

/**
 * Integrity rank 1–100: based on how quickly disclosures are filed after the disclosure date.
 * Uses createdAt (when we recorded it) vs disclosureDate (when the disclosure is for).
 * Lower delay = higher score. No eligible disclosures => 100 (benefit of doubt).
 */
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
  const avgDelayDays =
    delaysDays.reduce((a, b) => a + b, 0) / delaysDays.length;
  // 0 days delay => 100; ~50 days => 0. Penalty 2 points per day.
  const score = Math.round(100 - Math.min(100, avgDelayDays * 2));
  return Math.max(1, Math.min(100, score));
}

function rankGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-600 text-white";
    case "B":
      return "bg-green-500 text-white";
    case "C":
      return "bg-amber-500 text-white";
    case "D":
      return "bg-orange-500 text-white";
    default:
      return "bg-red-600 text-white";
  }
}

/** Ring stroke color by Integrity Rank: Green >80, Yellow 50–80, Red <50 */
function ringColor(rank: number): string {
  if (rank > 80) return "stroke-emerald-500";
  if (rank >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function normalizeJurisdiction(param: string | undefined): "federal" | "provincial" | null {
  const v = (param ?? "").toLowerCase();
  if (v === "federal") return "federal";
  if (v === "provincial") return "provincial";
  return null;
}

export default async function MemberProfileMasterPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { jurisdiction: jurisdictionParam } = await searchParams;

  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      riding: true,
      party: true,
      jurisdiction: true,
      photoUrl: true,
      officialId: true,
      chamber: true,
      integrityRank: true,
      disclosures: {
        orderBy: { id: "asc" as const },
        select: {
          id: true,
          category: true,
          description: true,
          disclosureDate: true,
          createdAt: true,
        },
      },
      tradeTickers: {
        select: { id: true, symbol: true, type: true, date: true },
      },
    },
  });

  if (!member) notFound();

  const integrityRank =
    member.integrityRank ?? computeIntegrityRank(member.disclosures);
  const grade = rankGrade(integrityRank);

  const bills = await prisma.bill.findMany({ take: 20 });
  const memberSymbols = [...new Set(member.tradeTickers.map((t) => t.symbol))];
  const conflictWarnings: {
    billNumber: string;
    title: string | null;
    tickers: string[];
  }[] = [];
  const sectorKeywords: Record<string, string[]> = {
    energy: ["ENB", "SU", "TRP", "CNQ"],
    rail: ["CNR", "CP"],
    banking: ["TD", "RY", "BNS", "BMO"],
    tech: ["SHOP"],
  };
  for (const bill of bills) {
    const title = (bill.title ?? "").toLowerCase();
    const matched: string[] = [];
    for (const [keyword, syms] of Object.entries(sectorKeywords)) {
      if (title.includes(keyword)) {
        for (const s of syms) {
          if (memberSymbols.includes(s)) matched.push(s);
        }
      }
    }
    if (matched.length > 0) {
      conflictWarnings.push({
        billNumber: bill.number,
        title: bill.title,
        tickers: [...new Set(matched)],
      });
    }
  }

  const backJurisdiction = normalizeJurisdiction(jurisdictionParam) ?? member.jurisdiction.toLowerCase();
  const backHref =
    backJurisdiction === "federal"
      ? "/members?jurisdiction=federal"
      : backJurisdiction === "provincial"
        ? "/members?jurisdiction=provincial"
        : "/members";

  const jobTitle =
    member.jurisdiction.toUpperCase() === "FEDERAL"
      ? "Member of Parliament"
      : "Member of Provincial Parliament";
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.name,
    jobTitle,
    description: `${jobTitle} for ${member.riding}, ${member.jurisdiction}. Financial disclosure and integrity profile.`,
    url: `${SITE_URL}/member/${member.id}`,
  };

  return (
    <AppShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href={backHref}
          className="inline-block text-sm font-sans text-[#64748B] hover:text-[#0F172A] mb-6"
        >
          ← Back to {backJurisdiction === "federal" ? "Federal" : "Provincial"} Members
        </Link>

        {/* Header: Photo (left), Name/Riding/Party (center), Integrity Rank (right) */}
        <header className="flex flex-wrap items-center gap-8 mb-10 border-b border-[#E2E8F0] pb-8">
          <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-[#F1F5F9]">
            <MemberPhoto
              member={{
                id: member.id,
                officialId: member.officialId,
                jurisdiction: member.jurisdiction,
                photoUrl: member.photoUrl,
              }}
              width={128}
              height={128}
              className="object-cover w-full h-full"
              alt={`Photo of ${member.name}`}
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl font-semibold text-[#0F172A]">
              {member.name}
            </h1>
            <p className="text-[#64748B] font-sans mt-1">
              {member.riding} · {member.party} · {member.jurisdiction}
              {member.chamber ? ` · ${member.chamber}` : ""}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="relative w-20 h-20 flex items-center justify-center"
              aria-label={`Integrity Rank ${integrityRank}: ${grade}`}
            >
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 36 36"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={ringColor(integrityRank)}
                  strokeDasharray={`${integrityRank} 100`}
                />
              </svg>
              <span
                className={`relative text-xl font-serif font-bold ${gradeColor(grade)} w-12 h-12 rounded-full flex items-center justify-center`}
              >
                {grade}
              </span>
            </div>
            <span className="text-xs font-sans text-[#64748B] mt-2">
              Integrity Rank
            </span>
            <span className="text-sm font-sans font-medium text-[#0F172A]">
              {integrityRank}/100
            </span>
            <p className="text-[10px] text-[#94A3B8] mt-1 max-w-[120px] text-center">
              Based on disclosure filing speed
            </p>
          </div>
        </header>

        {/* Trade History — real data from TradeTicker */}
        <section className="mb-10">
          <h2 className="font-serif text-lg font-semibold text-[#0F172A] mb-4">
            Trade History
          </h2>
          <MemberTradeTable
            trades={member.tradeTickers.map((t) => ({
              id: t.id,
              symbol: t.symbol,
              type: t.type,
              date: t.date,
            }))}
          />
        </section>

        {/* Conflict Warnings — real bill data */}
        {conflictWarnings.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-lg font-semibold text-[#0F172A] mb-4">
              Conflict Warnings
            </h2>
            <div className="space-y-3">
              {conflictWarnings.map((w) => (
                <div
                  key={w.billNumber}
                  className="border border-amber-200 bg-amber-50 rounded-[4px] p-4"
                >
                  <p className="font-sans font-medium text-[#0F172A]">
                    Bill {w.billNumber} — Holds assets in sector:{" "}
                    {w.tickers.join(", ")}
                  </p>
                  {w.title && (
                    <p className="text-sm text-[#64748B] mt-1">{w.title}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Financial Disclosures — real data from Disclosure */}
        <section>
          <h2 className="font-serif text-lg font-semibold text-[#0F172A] mb-4">
            Financial Disclosures
          </h2>
          <MemberDisclosureTable
            disclosures={member.disclosures.map((d) => ({
              id: d.id,
              category: d.category,
              description: d.description,
            }))}
          />
        </section>
      </div>
    </AppShell>
  );
}
