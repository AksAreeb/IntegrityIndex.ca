import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Normalize jurisdiction query param to DB value or undefined (all). */
function parseJurisdiction(value: string | null): "FEDERAL" | "PROVINCIAL" | undefined {
  const v = (value ?? "").toLowerCase();
  if (v === "federal") return "FEDERAL";
  if (v === "provincial") return "PROVINCIAL";
  return undefined;
}

/**
 * GET /api/members — List members for directory.
 * ?q= search (name, riding, party). ?jurisdiction=federal|provincial to filter by level.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const jurisdictionFilter = parseJurisdiction(searchParams.get("jurisdiction"));

    const searchClause = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { riding: { contains: q, mode: "insensitive" as const } },
            { party: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const where =
      jurisdictionFilter && searchClause
        ? { AND: [{ jurisdiction: jurisdictionFilter }, searchClause] }
        : jurisdictionFilter
          ? { jurisdiction: jurisdictionFilter }
          : searchClause ?? {};

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ jurisdiction: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        riding: true,
        party: true,
        jurisdiction: true,
        chamber: true,
        photoUrl: true,
      },
    });

    return NextResponse.json({ members });
  } catch (e) {
    console.error("[members]: GET failed", e);
    return NextResponse.json({ members: [] }, { status: 200 });
  }
}
