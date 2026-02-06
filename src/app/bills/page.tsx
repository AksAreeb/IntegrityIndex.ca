import { AppShell } from "@/components/AppShell";
import { BillCardList } from "./BillCardList";
import { BillsDataTable } from "./BillsDataTable";
import { prisma } from "@/lib/db";
import { getBillSummary } from "@/lib/mock-data";
import { getLinkedTickers, getSectorImpact } from "@/lib/bill-sectors";
import { getContextualBillSummary } from "@/lib/bills";
import { fetchLegisinfoBillsApi, isKeyVoteBill } from "@/lib/api/legisinfo";

export const revalidate = 300;

export default async function BillsPage() {
  const legisBills = await fetchLegisinfoBillsApi();

  const billsWithSummary = await Promise.all(
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Legislation
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-6">
          Bills from the 45th Parliament. Use &quot;Analyze&quot; to see a plain-language summary, sector impact, linked tickers, and any members with reported stock in that sector.
        </p>
        <BillsDataTable bills={billsWithSummary} />
        <h2 className="font-serif text-lg font-semibold text-[#0F172A] mt-10 mb-4">
          Key votes (card view)
        </h2>
        <BillCardList
          bills={billsWithSummary.map((b, i) => ({
            id: i,
            number: b.number,
            status: b.status,
            title: b.title,
            keyVote: b.keyVote,
            summary: b.summary,
            stakeholderMemberIds: b.stakeholderMemberIds,
          }))}
        />
      </div>
    </AppShell>
  );
}
