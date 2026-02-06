import axios from "axios";

const OPEN_NORTH_URL =
  "https://represent.opennorth.ca/representatives/ontario-legislature/?format=json&limit=150";

export interface OntarioMppRecord {
  id: string;
  name: string;
  riding: string;
  party: string;
  email?: string;
  /** OpenNorth API image/photo URL when available. */
  imageUrl?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalize(s: string | null | undefined, defaultVal: string): string {
  const t = (s ?? "").trim();
  return t && t !== "(not available)" ? t : defaultVal;
}

/**
 * Fetches Ontario MPPs from Open North API.
 * Maps: name -> name, district_name -> riding (constituency), extra.constituency_email -> email.
 */
export async function fetchOntarioMpps(): Promise<OntarioMppRecord[]> {
  try {
    const { data } = await axios.get<{ objects?: Record<string, unknown>[] }>(
      OPEN_NORTH_URL,
      {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
          Accept: "application/json",
        },
        validateStatus: (s) => s >= 200 && s < 400,
      }
    );

    const objects = data?.objects ?? [];
    if (!Array.isArray(objects)) return [];

    return objects
      .map((obj: Record<string, unknown>) => {
        const name = normalize(String(obj.name ?? ""), "Unknown");
        const districtName = normalize(
          String(obj.district_name ?? obj.district ?? ""),
          "Unknown"
        );
        const extra = obj.extra as Record<string, unknown> | undefined;
        const email =
          typeof extra?.constituency_email === "string"
            ? extra.constituency_email.trim()
            : undefined;
        const party = normalize(
          String(obj.party_name ?? obj.party ?? ""),
          "Independent"
        );
        const imageUrl =
          typeof obj.photo_url === "string"
            ? (obj.photo_url as string).trim()
            : typeof (obj as Record<string, unknown>).image === "string"
              ? ((obj as Record<string, unknown>).image as string).trim()
              : undefined;

        if (!name || name === "Unknown") return null;

        const id = slugify(`${name}-${districtName}`) || slugify(name);

        return {
          id,
          name,
          riding: districtName,
          party,
          ...(email && { email }),
          ...(imageUrl && { imageUrl }),
        };
      })
      .filter((r): r is OntarioMppRecord => r !== null && !!r.name);
  } catch (e) {
    console.error("[ontario scraper]: fetch failed", e);
    return [];
  }
}
