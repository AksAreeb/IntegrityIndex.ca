import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardMapAndLeaders } from "./DashboardMapAndLeaders";
import { prisma } from "@/lib/db";

function integrityScore(tradeCount: number): number {
  return Math.max(0, 100 - tradeCount * 5);
}

export default async function DashboardPage() {
  const membersWithTrades = await prisma.member.findMany({
    include: { _count: { select: { tradeTickers: true } } },
  });
  const withScore = membersWithTrades.map((m) => ({
    id: m.id,
    name: m.name,
    riding: m.riding,
    score: integrityScore(m._count.tradeTickers),
  }));
  const sorted = [...withScore].sort((a, b) => b.score - a.score);
  const leaders = sorted.slice(0, 3);
  const vested = [...sorted].reverse().slice(0, 3);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
            Interactive Governance Map
          </h1>
          <Link
            href="/analytics"
            className="text-sm font-sans font-medium text-[#0F172A] hover:text-[#334155]"
          >
            Analytics
          </Link>
        </div>

        <DashboardMapAndLeaders leaders={leaders} vested={vested} />
      </div>
    </AppShell>
  );
}
