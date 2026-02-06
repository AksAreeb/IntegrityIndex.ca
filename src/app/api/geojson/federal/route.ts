import { NextResponse } from "next/server";

// Federal: Open Canada dataset a73a3013-1527-4107-924d-a96b064c7fa4
// Fallback: Natural Earth 110m admin 1 (filtered for Canada)
const FALLBACK_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson";

export async function GET() {
  try {
    const res = await fetch(FALLBACK_URL, {
      next: { revalidate: 86400 },
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    const PROVINCE_TO_ID: Record<string, string> = {
      "british columbia": "british-columbia",
      "alberta": "alberta",
      "saskatchewan": "saskatchewan",
      "manitoba": "manitoba",
      "ontario": "ontario",
      "quebec": "quebec",
      "new brunswick": "new-brunswick",
      "nova scotia": "nova-scotia",
      "prince edward island": "prince-edward-island",
      "newfoundland and labrador": "newfoundland-and-labrador",
      "yukon": "yukon",
      "northwest territories": "northwest-territories",
      "nunavut": "nunavut",
    };
    const canadaFeatures = data.features?.filter(
      (f: { properties?: { adm0_a3?: string } }) =>
        f.properties?.adm0_a3 === "CAN"
    ) ?? [];
    return NextResponse.json({
      type: "FeatureCollection",
      features: canadaFeatures.map(
        (f: { properties?: Record<string, unknown>; geometry?: unknown }) => {
          const name = (f.properties?.name ?? f.properties?.NAME ?? "Unknown") as string;
          const ridingId =
            PROVINCE_TO_ID[name.toLowerCase()] ??
            name.toLowerCase().replace(/\s+/g, "-");
          return {
            ...f,
            properties: {
              ...f.properties,
              ridingName: name,
              ridingId,
              ENNAME: name,
            },
          };
        }
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load map data" },
      { status: 500 }
    );
  }
}
