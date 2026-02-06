import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { MemberDisclosureTable } from "./MemberDisclosureTable";
import { MemberPhoto } from "@/components/MemberPhoto";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { name: true, riding: true },
  });
  if (!member) return { title: "Member Not Found" };
  return {
    title: `${member.name} - Financial Integrity Profile`,
    description: `View stock trades and conflict-of-interest audits for ${member.name}, representing ${member.riding}.`,
  };
}

function integrityGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "bg-emerald-600 text-white";
    case "B": return "bg-green-500 text-white";
    case "C": return "bg-amber-500 text-white";
    case "D": return "bg-orange-500 text-white";
    default: return "bg-red-600 text-white";
  }
}

export default async function MemberProfileMasterPage({ params }: PageProps) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      riding: true,
      party: true,
      jurisdiction: true,
      photoUrl: true,
      chamber: true,
      disclosures: {
        orderBy: { id: "asc" as const },
        select: { id: true, category: true, description: true },
      },
      tradeTickers: {
        select: { id: true, symbol: true, type: true, date: true },
      },
    },
  });

  if (!member) notFound();

  const tradeCount = member.tradeTickers.length;
  const conflictCount = 0;
  const integrityScore = Math.max(0, 100 - tradeCount * 5 - conflictCount * 15);
  const grade = integrityGrade(integrityScore);

  const bills = await prisma.bill.findMany({ take: 20 });
  const memberSymbols = [...new Set(member.tradeTickers.map((t) => t.symbol))];
  const conflictWarnings: { billNumber: string; title: string | null; tickers: string[] }[] = [];
  const sectorKeywords: Record<string, string[]> = {
    "energy": ["ENB", "SU", "TRP", "CNQ"],
    "rail": ["CNR", "CP"],
    "banking": ["TD", "RY", "BNS", "BMO"],
    "tech": ["SHOP"],
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

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href="/mps"
          className="inline-block text-sm font-sans text-[#64748B] hover:text-[#0F172A] mb-6"
        >
          ← Back to Representatives
        </Link>

        {/* Header: photo, party, jurisdiction, Integrity Grade */}
        <header className="flex flex-wrap items-start gap-8 mb-10">
          <span className="relative w-32 h-32 rounded-lg overflow-hidden bg-[#F1F5F9] flex-shrink-0">
            <MemberPhoto
              member={{
                id: member.id,
                jurisdiction: member.jurisdiction,
                photoUrl: member.photoUrl,
              }}
              width={128}
              height={128}
              className="object-cover w-full h-full"
              alt={`Photo of ${member.name}`}
            />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl font-semibold text-[#0F172A]">
              {member.name}
            </h1>
            <p className="text-[#64748B] font-sans mt-1">
              {member.riding} · {member.party} · {member.jurisdiction}
              {member.chamber ? ` · ${member.chamber}` : ""}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <span
                className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl font-serif font-bold ${gradeColor(grade)}`}
                aria-label={`Integrity Grade ${grade}`}
              >
                {grade}
              </span>
              <span className="text-sm font-sans text-[#64748B]">
                Integrity Score: {integrityScore}/100
              </span>
            </div>
          </div>
        </header>

        {/* Financial Insights */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="border border-[#E2E8F0] rounded-[4px] p-6 bg-white">
            <h2 className="font-serif text-lg font-semibold text-[#0F172A] mb-2">
              Net Worth Delta
            </h2>
            <p className="text-2xl font-serif font-semibold text-[#64748B]">
              Data not available
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Δ NW = Σ(Current asset values) − Σ(Initial). Requires valued disclosures.
            </p>
          </div>
          <div className="border border-[#E2E8F0] rounded-[4px] p-6 bg-white">
            <h2 className="font-serif text-lg font-semibold text-[#0F172A] mb-2">
              Integrity Score Gauge
            </h2>
            <p className="text-2xl font-serif font-semibold" style={{ color: "var(--primary-accent)" }}>
              {integrityScore}
              <span className="text-lg text-[#64748B] font-normal">/100</span>
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Formula: 100 − (Trades × 5) − (Conflicts × 15). Trades: {tradeCount}.
            </p>
            <div className="mt-2 h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F172A] rounded-full transition-all"
                style={{ width: `${integrityScore}%` }}
              />
            </div>
          </div>
        </section>

        {/* Bill Impact / Conflict Warnings */}
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
                    Sponsoring Bill {w.billNumber} — Holds Assets in: {w.tickers.join(", ")}
                  </p>
                  {w.title && (
                    <p className="text-sm text-[#64748B] mt-1">{w.title}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disclosure List */}
        <section>
          <h2 className="font-serif text-lg font-semibold text-[#0F172A] mb-4">
            Financial Disclosures
          </h2>
          <MemberDisclosureTable disclosures={member.disclosures} />
        </section>
      </div>
    </AppShell>
  );
}
