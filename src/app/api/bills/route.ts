import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CACHE_FINANCIAL = "public, s-maxage=1800, stale-while-revalidate=1800";

export async function GET() {
  try {
    const bills = await prisma.bill.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, status: true, title: true, keyVote: true },
    });
    return NextResponse.json(
      { bills },
      { headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  } catch (e) {
    console.error("[bills]: GET failed", e);
    return NextResponse.json(
      { bills: [] },
      { status: 200, headers: { "Cache-Control": CACHE_FINANCIAL } }
    );
  }
}
