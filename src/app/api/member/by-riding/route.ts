import { NextResponse } from "next/server";
import { getMemberByRidingId, resolveMemberIdFromRiding } from "@/lib/member-service";
import { getMemberByRiding } from "@/lib/db-utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ridingId = searchParams.get("ridingId");
  const ridingName = searchParams.get("ridingName");
  const ridingNumParam = searchParams.get("ridingNum");
  const jurisdiction = searchParams.get("jurisdiction") as "FEDERAL" | "PROVINCIAL" | undefined;

  if (ridingName && jurisdiction) {
    const memberId = await resolveMemberIdFromRiding(ridingName, jurisdiction);
    if (!memberId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ id: memberId });
  }

  if (ridingNumParam != null) {
    const ridingNum = Number(ridingNumParam);
    if (!Number.isInteger(ridingNum) || ridingNum < 1) {
      return NextResponse.json(
        { error: "Invalid ridingNum" },
        { status: 400 }
      );
    }
    const member = await getMemberByRiding(
      ridingNum,
      jurisdiction as "FEDERAL" | "PROVINCIAL" | undefined
    );
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ id: member.id });
  }

  if (!ridingId || typeof ridingId !== "string") {
    return NextResponse.json(
      { error: "ridingId or ridingNum required" },
      { status: 400 }
    );
  }

  const normalized = ridingId.toLowerCase().replace(/\s+/g, "-");
  const profile = await getMemberByRidingId(normalized);
  if (!profile) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  return NextResponse.json({ id: profile.id });
}
