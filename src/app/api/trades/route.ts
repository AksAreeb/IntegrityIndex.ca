import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveStockPrice } from "@/lib/api/stocks";
import { checkConflict } from "@/lib/conflict-audit";

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
  /** Disclosure date for ticker label (trade date; use for "Disclosed: [Date]"). */
  disclosureDate: string;
  /** Current market price from Finnhub */
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  party?: string;
  /** Public Interest Audit — High-Risk Conflict flag */
  isHighRiskConflict?: boolean;
  conflictReason?: string;
}

export const dynamic = "force-dynamic";

const CACHE_FINANCIAL = "private, no-store, max-age=0";

/**
 * GET /api/trades — Live trades for ticker. Bridge 44th/45th Parliament: no year filter.
 * Top 24 most recent trades regardless of year so 2025/2024 data fills the gap when 2026 is sparse.
 * orderBy: date desc so 2026 data stays at the front as it trickles in.
 */
export async function GET() {
  try {
    const recent = await prisma.tradeTicker.findMany({
      where: {
        symbol: { not: "" },
        memberId: { not: "" },
      },
      take: 24,
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
    });

    if (recent.length === 0) {
      return NextResponse.json(
        { items: [] },
        { status: 200, headers: { "Cache-Control": CACHE_FINANCIAL } }
      );
    }

    const memberIds = [...new Set(recent.map((t) => t.memberId))];
    const conflictCache: Record<
      string,
      { conflicts: { conflictReason: string; asset: string }[] }
    > = {};
    await Promise.all(
      memberIds.map(async (mid) => {
        const r = await checkConflict(mid);
        conflictCache[mid] = {
          conflicts: r.conflicts.map((c) => ({ conflictReason: c.conflictReason, asset: c.asset })),
        };
      })
    );

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
      const dateIso = t.date.toISOString();
      const dateYmd = dateIso.slice(0, 10);
      const cache = conflictCache[t.memberId];
      const conflict = cache?.conflicts?.find(
        (c) => c.asset.toUpperCase() === t.symbol.toUpperCase()
      );
      return {
        memberName: t.member.name,
        memberPhotoUrl: t.member.photoUrl ?? null,
        jurisdiction: t.member.jurisdiction,
        riding: t.member.riding,
        type: t.type as "BUY" | "SELL",
        symbol: t.symbol,
        memberId: t.memberId,
        date: dateYmd,
        dateIso,
        disclosureDate: dateYmd,
        currentPrice: p?.currentPrice,
        dailyChange: p?.dailyChange,
        changePercent: p?.changePercent,
        party: t.member.party ?? undefined,
        isHighRiskConflict: !!conflict,
        conflictReason: conflict?.conflictReason,
      };
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isColumnError = /P2022|column|does not exist|not available/i.test(msg);
    console.error("[trades]: GET failed", isColumnError ? `P2022/column: ${msg}` : e);
    return NextResponse.json(
      { items: [] },
      { status: 200, headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  }
}
