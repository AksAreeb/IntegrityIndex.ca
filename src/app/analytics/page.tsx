import { AppShell } from "@/components/AppShell";
import { LobbyistHeatmap } from "@/components/experimental/LobbyistHeatmap";
import { WealthTimeline, type DisclosurePoint } from "@/components/experimental/WealthTimeline";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const memberWithDisclosures = await prisma.member.findFirst({
    where: { disclosures: { some: {} } },
    select: {
      id: true,
      disclosures: {
        select: {
          id: true,
          category: true,
          description: true,
          sourceUrl: true,
          disclosureDate: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const disclosureSeries: DisclosurePoint[] | undefined = memberWithDisclosures?.disclosures
    ? (() => {
        const list = memberWithDisclosures.disclosures;
        if (list.length === 0) return undefined;
        const sorted = [...list].sort((a, b) => {
          const da = a.disclosureDate?.getTime?.() ?? 0;
          const db = b.disclosureDate?.getTime?.() ?? 0;
          return da - db;
        });
        return sorted.map((d, i) => {
          const dateRaw = d.disclosureDate;
          const dateStr =
            dateRaw != null
              ? dateRaw instanceof Date
                ? dateRaw.toISOString().slice(0, 10)
                : new Date(dateRaw).toISOString().slice(0, 10)
              : "";
          const label =
            dateRaw != null
              ? dateRaw instanceof Date
                ? dateRaw.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
                : new Date(dateRaw).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
              : list.length === 1
                ? "Baseline"
                : "Unknown Date";
          return {
            date: dateStr || "Unknown Date",
            value: 100 + i * 10,
            label,
          };
        });
      })()
    : undefined;

  const tsxSymbol = await prisma.stockPriceCache.findFirst({
    where: {
      symbol: { in: ["^GSPTSE", "GSPTSE", "XIC"] },
    },
    orderBy: { updatedAt: "desc" },
  });
  const BASE_TSX_60 = 2400;
  const benchmarkSeries =
    tsxSymbol && disclosureSeries && disclosureSeries.length > 0
      ? (() => {
          const normalized = 100 * (tsxSymbol.price / BASE_TSX_60);
          const startLabel =
            disclosureSeries.length === 1
              ? "Baseline"
              : disclosureSeries[0]?.label ?? "Start";
          return [
            { period: startLabel, value: 100 },
            { period: "Current", value: Math.round(normalized * 10) / 10 },
          ];
        })()
      : null;

  const assetsFromDisclosures =
    memberWithDisclosures?.disclosures?.map((d) => {
      const disclosureDateRaw = d.disclosureDate;
      const disclosureDate: string =
        disclosureDateRaw != null
          ? disclosureDateRaw instanceof Date
            ? disclosureDateRaw.toISOString().slice(0, 10)
            : new Date(disclosureDateRaw).toISOString().slice(0, 10)
          : "Unknown Date";
      return {
        id: `disclosure-${d.id}`,
        type: d.category.includes("Equity") || d.category.includes("Stock") ? ("Stocks" as const) : ("Other" as const),
        description: d.description?.slice(0, 200) ?? d.category,
        industryTags: [] as string[],
        disclosureDate,
        sourceUrl: d.sourceUrl ?? null,
        amountRange: null as string | null,
      };
    }) ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Analytics
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-8">
          Transparency analytics: wealth timeline from disclosure filing dates and market benchmark overlay.
        </p>

        <div className="space-y-8">
          <LobbyistHeatmap />
          <WealthTimeline
            preOfficeAssets={[]}
            currentAssets={assetsFromDisclosures}
            disclosureSeries={disclosureSeries}
            benchmarkSeries={benchmarkSeries ?? undefined}
          />
        </div>
      </div>
    </AppShell>
  );
}
