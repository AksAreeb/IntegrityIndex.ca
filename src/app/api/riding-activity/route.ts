import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeRidingKey } from "@/lib/geo-utils";

export interface RidingActivityItem {
  /** Stable key for map data-join (matches geo.properties.ridingId). */
  ridingKey: string;
  ridingName: string;
  party: string | null;
  /** Number of Material Change disclosures (TradeTicker rows) for this riding's MP. */
  tradeCount: number;
}

/**
 * GET /api/riding-activity — per-riding trade count for choropleth data-join.
 * Key by ridingKey (normalized riding name) so the map can join to GeoJSON/TopoJSON features.
 */
export async function GET() {
  try {
    const members = await prisma.member.findMany({
      where: { jurisdiction: "FEDERAL" },
      select: {
        id: true,
        riding: true,
        party: true,
        _count: { select: { tradeTickers: true } },
      },
    });

    const items: RidingActivityItem[] = members.map((m) => ({
      ridingKey: normalizeRidingKey(m.riding),
      ridingName: m.riding,
      party: m.party,
      tradeCount: m._count.tradeTickers,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[riding-activity]: GET failed", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
