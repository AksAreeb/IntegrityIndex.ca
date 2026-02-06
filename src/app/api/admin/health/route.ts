import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/admin-health";

export async function GET() {
  try {
    const status = await getHealthStatus();
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json(
      {
        openNorth: false,
        finnhub: false,
        legisinfo: false,
        lastSuccessfulSync: null,
        error: e instanceof Error ? e.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
