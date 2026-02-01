import { NextResponse } from "next/server";
import { getRidingByPostalCode, resolvePostalCode } from "@/lib/api/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? searchParams.get("postal");
  const resolve = searchParams.get("resolve") === "1" || searchParams.get("resolve") === "true";
  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { error: "Query param 'code' or 'postal' required" },
      { status: 400 }
    );
  }
  if (resolve) {
    const result = await resolvePostalCode(code);
    if (!result) {
      return NextResponse.json(
        { error: "No member found for this postal code" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      id: result.memberId,
      ridingId: result.ridingId,
      ridingName: result.ridingName,
      memberName: result.memberName,
    });
  }
  const result = await getRidingByPostalCode(code);
  if (!result) {
    return NextResponse.json(
      { error: "No riding found for this postal code" },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}
