import axios from "axios";

/** Current OLA members listing (updated URL). Fallback to export path if main URL returns non-JSON. */
const OLA_MEMBERS_URL = "https://www.ola.org/en/members/current";
const OLA_MEMBERS_EXPORT_JSON = "https://www.ola.org/en/members/current/export/json";

export interface OntarioMppRecord {
  id: string;
  name: string;
  riding: string;
  party: string;
}

/** Normalize scraped value: "(not available)" or empty -> default for Prisma (no invalid column/value). */
function normalizeMemberString(value: string, defaultVal: string): string {
  const s = (value ?? "").trim();
  if (!s || s === "(not available)" || s.toLowerCase() === "(not available)") return defaultVal;
  return s;
}

/**
 * Fetches current Ontario MPPs from the Legislative Assembly of Ontario.
 * Uses OLA members URL; if fetch fails (e.g. 404), returns [] so the rest of the sync can continue.
 */
async function fetchOntarioJson(url: string): Promise<unknown> {
  const { data } = await axios.get<unknown>(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
      Accept: "application/json",
    },
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return data;
}

function parseOntarioResponse(data: unknown): OntarioMppRecord[] {
  const raw = Array.isArray(data) ? data : (data as Record<string, unknown>)?.members ?? (data as Record<string, unknown>)?.Members ?? [];
  const list = Array.isArray(raw) ? raw : [];

    return list
      .map((m: Record<string, unknown>) => {
        const id = String(m.id ?? m.MemberId ?? m.memberId ?? "").trim();
        const name = normalizeMemberString(
          String(m.name ?? m.Name ?? m.fullName ?? ""),
          "Unknown"
        );
        const riding = normalizeMemberString(
          String(m.riding ?? m.Riding ?? m.constituency ?? ""),
          "Unknown"
        );
        const party = normalizeMemberString(
          String(m.party ?? m.Party ?? ""),
          "Independent"
        );
        if (!id && name === "Unknown") return null;
        return {
          id: id || slugify(name),
          name: name || "Unknown",
          riding: riding || "Unknown",
          party: party || "Independent",
        };
      })
      .filter((r): r is OntarioMppRecord => r !== null && !!r.name);
}

export async function fetchOntarioMpps(): Promise<OntarioMppRecord[]> {
  try {
    let data: unknown;
    try {
      data = await fetchOntarioJson(OLA_MEMBERS_URL);
      const list = parseOntarioResponse(data);
      if (list.length > 0) return list;
    } catch {
      // Main URL failed (e.g. 404); try export path
    }
    try {
      data = await fetchOntarioJson(OLA_MEMBERS_EXPORT_JSON);
      return parseOntarioResponse(data);
    } catch (e) {
      console.error("[ontario-mpps]: fetch failed", e);
      return [];
    }
  } catch (e) {
    console.error("[ontario-mpps]: fetch failed", e);
    return [];
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
