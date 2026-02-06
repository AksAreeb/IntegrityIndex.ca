import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export interface RidingActivityItem {
  ridingId: string;
  ridingName: string;
  party: string;
  tradeCount: number;
}

/**
 * GET /api/riding-activity — ridingId -> party and trade count for map highlighting.
 */
export async function GET() {
  try {
    const members = await prisma.member.findMany({
      where: { jurisdiction: "FEDERAL" },
      include: {
        _count: { select: { tradeTickers: true } },
      },
      select: {
        id: true,
        riding: true,
        party: true,
        _count: { select: { tradeTickers: true } },
      },
    });

    const items: RidingActivityItem[] = members.map((m) => ({
      ridingId: m.id,
      ridingName: m.riding,
      party: m.party,
      tradeCount: m._count.tradeTickers,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
