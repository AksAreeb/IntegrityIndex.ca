import axios from "axios";

const REPRESENT_BASE =
  "https://represent.opennorth.ca/representatives/ontario-legislature";

export interface OntarioMppRecord {
  id: string;
  name: string;
  riding: string;
  party: string;
  email?: string;
  /** OLA CDN photo URL (from Represent API or derived from member URL). */
  imageUrl?: string;
  /** OLA member URL slug for photo fallback (e.g. "stephen-lecce"). */
  olaSlug?: string;
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

/** Extract OLA slug from member URL: https://www.ola.org/en/members/all/stephen-lecce -> stephen-lecce */
function extractOlaSlugFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/members\/all\/([^/?]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Build OLA CDN photo URL when API doesn't provide one. Uses member URL slug. */
const OLA_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/member/profile-photo";

function buildOlaPhotoUrl(olaSlug: string): string {
  const fileName =
    olaSlug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("_") + ".jpg";
  return `${OLA_PHOTO_BASE}/${fileName}`;
}

/**
 * Parse a single Member object from Represent API (2026 shape).
 * Handles: name, district_name, party_name, photo_url, url.
 */
function parseMember(obj: Record<string, unknown>): OntarioMppRecord | null {
  const name = normalize(String(obj.name ?? obj.first_name ?? ""), "Unknown");
  const districtName = normalize(
    String(obj.district_name ?? obj.district ?? ""),
    "Unknown"
  );
  const party = normalize(
    String(obj.party_name ?? obj.party ?? ""),
    "Independent"
  );
  const memberUrl = typeof obj.url === "string" ? obj.url : undefined;
  const olaSlug = extractOlaSlugFromUrl(memberUrl) ?? (slugify(`${name}-${districtName}`) || slugify(name));

  if (!name || name === "Unknown") return null;

  const imageUrl =
    typeof obj.photo_url === "string"
      ? (obj.photo_url as string).trim()
      : typeof (obj as { image?: string }).image === "string"
        ? ((obj as { image: string }).image as string).trim()
        : buildOlaPhotoUrl(olaSlug);

  const id = `ON-${olaSlug}`;

  return { id, name, riding: districtName, party, imageUrl, olaSlug };
}

/**
 * Fetches Ontario MPPs from Represent API with pagination.
 * Handles 2026 Member object shape. Never skips — always fetches all pages.
 */
export async function fetchOntarioMpps(): Promise<OntarioMppRecord[]> {
  const all: OntarioMppRecord[] = [];
  const seen = new Set<string>();
  let offset = 0;
  const limit = 100;

  try {
    for (;;) {
      const { data } = await axios.get<{
        objects?: Record<string, unknown>[];
        meta?: { next?: string | null; total_count?: number };
      }>(`${REPRESENT_BASE}/?format=json&limit=${limit}&offset=${offset}`, {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
          Accept: "application/json",
        },
        validateStatus: (s) => s >= 200 && s < 400,
      });

      const raw = data as Record<string, unknown> | undefined;
      const objects = Array.isArray(raw?.objects)
        ? raw.objects
        : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

      if (!Array.isArray(objects) || objects.length === 0) break;

      for (const obj of objects) {
        if (obj == null || typeof obj !== "object") continue;
        const rec = parseMember(obj as Record<string, unknown>);
        if (rec && !seen.has(rec.id)) {
          seen.add(rec.id);
          all.push(rec);
        }
      }

      const meta = raw?.meta as { next?: string | null } | undefined;
      if (!meta?.next) break;
      offset += limit;
    }

    return all;
  } catch (e) {
    console.error("[ontario scraper]: fetch failed", e);
    return [];
  }
}
