import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { LegislationTable } from "./LegislationTable";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";
import { getBillSummary } from "@/lib/fallback-data";
import { getLinkedTickers, getSectorImpact } from "@/lib/bill-sectors";
import { getContextualBillSummary } from "@/lib/bills";
import { fetchLegisinfoBillsApi, isKeyVoteBill } from "@/lib/api/legisinfo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Legislation - Conflict Audit",
  description:
    "Analyzing financial stakeholders for bills in the 45th Parliament.",
  alternates: { canonical: `${SITE_URL}/legislation` },
};

export default async function LegislationPage() {
  const legisBills = await fetchLegisinfoBillsApi();

  const billsWithAnalysis = await Promise.all(
    legisBills.map(async (b) => {
      const mockSummary = getBillSummary(b.number);
      const searchText = [b.title ?? "", mockSummary?.plainLanguage ?? ""].join(" ");
      const sectors = getSectorImpact(searchText);
      const sector = sectors.length > 0 ? sectors[0] : undefined;
      const summary = mockSummary ?? { plainLanguage: getContextualBillSummary({ number: b.number, title: b.title }, sector) };
      const sectorSymbols = getLinkedTickers(searchText);
      let stakeholderMemberIds: string[] = [];
      if (sectorSymbols.length > 0) {
        const trades = await prisma.tradeTicker.findMany({
          where: { symbol: { in: sectorSymbols } },
          select: { memberId: true },
        });
        stakeholderMemberIds = [...new Set(trades.map((t) => t.memberId))];
      }
      let stakeholderNames: string[] = [];
      if (stakeholderMemberIds.length > 0) {
        const members = await prisma.member.findMany({
          where: { id: { in: stakeholderMemberIds } },
          select: { id: true, name: true },
        });
        const byId = new Map(members.map((m) => [m.id, m.name]));
        stakeholderNames = stakeholderMemberIds.map((id) => byId.get(id) ?? id);
      }
      return {
        number: b.number,
        status: b.status,
        title: b.title ?? "",
        keyVote: b.isKeyVote ?? isKeyVoteBill(b.number),
        summary,
        stakeholderMemberIds,
        stakeholderNames,
      };
    })
  );

  return (
    <AppShell>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Legislation
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-6">
          Bills from the 45th Parliament (LEGISinfo 45-1). Open &quot;Analysis&quot; for a System Analysis summary and Stakeholder Warning when members have reported stock in the bill&apos;s sector.
        </p>
        <LegislationTable bills={billsWithAnalysis} />
      </div>
    </AppShell>
  );
}
