import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveStockPrice } from "@/lib/api/stocks";

export interface LiveTickerItem {
  memberName: string;
  memberPhotoUrl: string | null;
  jurisdiction: string;
  riding: string;
  type: "BUY" | "SELL";
  symbol: string;
  memberId: string;
  date: string;
  dateIso: string;
  /** Current market price from Finnhub */
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  party?: string;
}

const CACHE_FINANCIAL = "public, s-maxage=1800, stale-while-revalidate=1800"; // 30 min

/**
 * GET /api/trades — Live trades for ticker. Returns [] when no trades (no error).
 * Cache: 30 min for financial APIs.
 */
export async function GET() {
  try {
    const recent = await prisma.tradeTicker.findMany({
      take: 24,
      orderBy: { date: "desc" },
      include: { member: true },
    });

    if (recent.length === 0) {
      return NextResponse.json(
        { items: [] },
        { status: 200, headers: { "Cache-Control": CACHE_FINANCIAL } }
      );
    }

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
        memberPhotoUrl: t.member.photoUrl ?? null,
        jurisdiction: t.member.jurisdiction,
        riding: t.member.riding,
        type: t.type as "BUY" | "SELL",
        symbol: t.symbol,
        memberId: t.memberId,
        date: t.date.toISOString().slice(0, 10),
        dateIso: t.date.toISOString(),
        currentPrice: p?.currentPrice,
        dailyChange: p?.dailyChange,
        changePercent: p?.changePercent,
        party: t.member.party ?? undefined,
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
