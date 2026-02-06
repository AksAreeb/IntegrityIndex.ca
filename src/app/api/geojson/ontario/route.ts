import { NextResponse } from "next/server";

const ONTARIO_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson";

export async function GET() {
  try {
    const res = await fetch(ONTARIO_GEOJSON_URL, {
      next: { revalidate: 86400 },
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    const ontarioFeature = data.features?.find(
      (f: { properties?: { name?: string; adm0_a3?: string } }) =>
        f.properties?.adm0_a3 === "CAN" &&
        (f.properties?.name === "Ontario" ||
          (f.properties?.name as string)?.toLowerCase?.().includes("ontario"))
    );
    if (!ontarioFeature) {
      return NextResponse.json({ error: "Ontario not found" }, { status: 404 });
    }
    return NextResponse.json({
      type: "FeatureCollection",
      features: [
        {
          ...ontarioFeature,
          properties: {
            ...ontarioFeature.properties,
            ridingName: "Ontario",
            ridingId: "ontario",
          },
        },
      ],
    });
  } catch (e) {
    console.error("[geojson/ontario]: GET failed", e);
    return NextResponse.json(
      { error: "Failed to load map data" },
      { status: 500 }
    );
  }
}
