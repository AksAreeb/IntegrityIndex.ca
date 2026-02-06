import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/members — List members for directory. ?q= for search (name, riding).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { riding: { contains: q, mode: "insensitive" as const } },
            { party: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

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
  } catch {
    return NextResponse.json({ members: [] }, { status: 200 });
  }
}
