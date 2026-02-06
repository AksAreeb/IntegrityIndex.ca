import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveStockPrice } from "@/lib/api/stocks";

export interface LiveTickerItem {
  memberName: string;
  riding: string;
  type: "BUY" | "SELL";
  symbol: string;
  memberId: string;
  date: string;
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
}

const CACHE_FINANCIAL = "public, s-maxage=1800, stale-while-revalidate=1800";

export async function GET() {
  try {
    const recent = await prisma.tradeTicker.findMany({
      take: 24,
      orderBy: { date: "desc" },
      include: { member: true },
    });

    const symbols = [...new Set(recent.map((t) => t.symbol))];
    const prices: Record<
      string,
      { currentPrice: number; dailyChange: number; changePercent: number }
    > = {};
    await Promise.all(
      symbols.map(async (sym) => {
        const q = await getLiveStockPrice(sym);
        if (!q) return;
        const prev = q.currentPrice - q.dailyChange;
        const changePercent =
          prev > 0 ? (q.dailyChange / prev) * 100 : 0;
        prices[sym] = {
          currentPrice: q.currentPrice,
          dailyChange: q.dailyChange,
          changePercent,
        };
      })
    );

    const items: LiveTickerItem[] = recent.map((t) => {
      const p = prices[t.symbol];
      return {
        memberName: t.member.name,
        riding: t.member.riding,
        type: t.type as "BUY" | "SELL",
        symbol: t.symbol,
        memberId: t.memberId,
        date: t.date.toISOString().slice(0, 10),
        currentPrice: p?.currentPrice,
        dailyChange: p?.dailyChange,
        changePercent: p?.changePercent,
      };
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  } catch {
    return NextResponse.json(
      { items: [] },
      { status: 200, headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  }
}
