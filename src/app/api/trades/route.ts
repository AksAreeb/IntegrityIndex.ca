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
  /** Current market price from Finnhub */
  currentPrice?: number;
  /** Daily change from Finnhub */
  dailyChange?: number;
  changePercent?: number;
}

/**
 * GET /api/trades — Live trades for ticker (SWR / 60s revalidate).
 * Queries prisma.tradeTicker.findMany() and returns items as JSON.
 */
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

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Failed to load trades", items: [] },
      { status: 200 }
    );
  }
}
