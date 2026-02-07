import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkConflict } from "@/lib/conflict-audit";
import { getLiveStockPrice } from "@/lib/api/stocks";

export const dynamic = "force-dynamic";

export interface PulseItem {
  id: string;
  type: "trade" | "disclosure";
  memberId: string;
  memberName: string;
  memberPhotoUrl: string | null;
  jurisdiction: string;
  riding: string;
  party?: string;
  /** For trades */
  symbol?: string;
  tradeType?: "BUY" | "SELL";
  date: string;
  dateIso: string;
  disclosureDate: string;
  /** Conflict flag */
  isHighRiskConflict: boolean;
  conflictReason?: string;
  /** Price info for trades */
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  /** For disclosures */
  category?: string;
  description?: string;
}

const CACHE_FINANCIAL = "private, no-store, max-age=0";

export async function GET() {
  try {
    const [recentTrades, recentDisclosures] = await Promise.all([
      prisma.tradeTicker.findMany({
        where: { symbol: { not: "" }, memberId: { not: "" } },
        take: 30,
        orderBy: { date: "desc" },
        select: {
          id: true,
          symbol: true,
          type: true,
          date: true,
          memberId: true,
          member: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              jurisdiction: true,
              riding: true,
              party: true,
            },
          },
        },
      }),
      prisma.disclosure.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          category: true,
          description: true,
          disclosureDate: true,
          createdAt: true,
          conflictFlag: true,
          conflictReason: true,
          memberId: true,
          member: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              jurisdiction: true,
              riding: true,
              party: true,
            },
          },
        },
      }),
    ]);

    const memberIds = [
      ...new Set([
        ...recentTrades.map((t) => t.memberId),
        ...recentDisclosures.map((d) => d.memberId),
      ]),
    ];
    const conflictCache: Record<
      string,
      { hasConflict: boolean; conflicts: { conflictReason: string; asset: string }[] }
    > = {};
    await Promise.all(
      memberIds.map(async (mid) => {
        const r = await checkConflict(mid);
        conflictCache[mid] = {
          hasConflict: r.hasConflict,
          conflicts: r.conflicts.map((c) => ({
            conflictReason: c.conflictReason,
            asset: c.asset,
          })),
        };
      })
    );

    const symbols = [...new Set(recentTrades.map((t) => t.symbol))];
    const prices: Record<
      string,
      { currentPrice: number; dailyChange: number; changePercent: number }
    > = {};
    await Promise.all(
      symbols.map(async (sym) => {
        const q = await getLiveStockPrice(sym);
        if (!q) return;
        const prev = q.currentPrice - q.dailyChange;
        const changePercent = prev > 0 ? (q.dailyChange / prev) * 100 : 0;
        prices[sym] = {
          currentPrice: q.currentPrice,
          dailyChange: q.dailyChange,
          changePercent,
        };
      })
    );

    const items: PulseItem[] = [];

    for (const t of recentTrades) {
      const cache = conflictCache[t.memberId];
      const conflict = cache?.conflicts?.find(
        (c) => c.asset.toUpperCase() === t.symbol.toUpperCase()
      );
      const dateIso = t.date.toISOString();
      const dateYmd = dateIso.slice(0, 10);
      const p = prices[t.symbol];
      items.push({
        id: `trade-${t.id}`,
        type: "trade",
        memberId: t.memberId,
        memberName: t.member.name,
        memberPhotoUrl: t.member.photoUrl ?? null,
        jurisdiction: t.member.jurisdiction,
        riding: t.member.riding,
        party: t.member.party ?? undefined,
        symbol: t.symbol,
        tradeType: t.type as "BUY" | "SELL",
        date: dateYmd,
        dateIso,
        disclosureDate: dateYmd,
        isHighRiskConflict: !!conflict,
        conflictReason: conflict?.conflictReason,
        currentPrice: p?.currentPrice,
        dailyChange: p?.dailyChange,
        changePercent: p?.changePercent,
      });
    }

    for (const d of recentDisclosures) {
      const fromDb = Boolean(d.conflictFlag && d.conflictReason);
      const cache = fromDb ? null : conflictCache[d.memberId];
      const conflict = fromDb
        ? { conflictReason: d.conflictReason! }
        : cache?.conflicts?.find((c) =>
            d.description.toLowerCase().includes(c.asset.toLowerCase())
          );
      const createdAt = d.createdAt.toISOString();
      const dateYmd = createdAt.slice(0, 10);
      const discDate = d.disclosureDate
        ? d.disclosureDate.toISOString().slice(0, 10)
        : dateYmd;
      items.push({
        id: `disclosure-${d.id}`,
        type: "disclosure",
        memberId: d.memberId,
        memberName: d.member.name,
        memberPhotoUrl: d.member.photoUrl ?? null,
        jurisdiction: d.member.jurisdiction,
        riding: d.member.riding,
        party: d.member.party ?? undefined,
        date: discDate,
        dateIso: createdAt,
        disclosureDate: discDate,
        isHighRiskConflict: fromDb || !!conflict,
        conflictReason: fromDb ? (d.conflictReason ?? undefined) : conflict?.conflictReason,
        category: d.category,
        description: d.description,
      });
    }

    items.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
    const limited = items.slice(0, 40);

    return NextResponse.json(
      { items: limited },
      { headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  } catch (e) {
    console.error("[pulse]: GET failed", e);
    return NextResponse.json(
      { items: [] },
      { status: 200, headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  }
}
