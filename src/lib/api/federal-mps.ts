import axios from "axios";

const FEDERAL_MEMBERS_EXPORT =
  "https://www.ourcommons.ca/en/members/export/json";

export interface FederalMpRecord {
  id: string;
  name: string;
  riding: string;
  party: string;
}

/**
 * Fetches current federal MPs from the House of Commons export.
 * Returns records suitable for upsert into Member with jurisdiction FEDERAL
 * and chamber House of Commons. Member id is the official Parliament ID (for 45th photo URL).
 */
export async function fetchFederalMps(): Promise<FederalMpRecord[]> {
  try {
    const { data } = await axios.get<unknown>(FEDERAL_MEMBERS_EXPORT, {
      timeout: 20000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
        Accept: "application/json",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const raw = Array.isArray(data) ? data : (data as Record<string, unknown>)?.Members ?? (data as Record<string, unknown>)?.members ?? (data as Record<string, unknown>)?.items ?? [];
    const list = Array.isArray(raw) ? raw : [];

    return list
      .map((m: Record<string, unknown>) => {
        const id = String(m.OfficialId ?? m.officialId ?? m.Id ?? m.id ?? "").trim();
        const name = String(m.PersonShortName ?? m.personShortName ?? m.Name ?? m.name ?? "").trim();
        const riding = String(m.ConstituencyName ?? m.constituencyName ?? m.Riding ?? m.riding ?? "").trim();
        const party = String(m.CaucusShortName ?? m.caucusShortName ?? m.Party ?? m.party ?? "").trim();
        if (!id && !name) return null;
        return {
          id: id || slugify(name + riding),
          name: name || "Unknown",
          riding: riding || "Unknown",
          party: party || "Independent",
        };
      })
      .filter((r): r is FederalMpRecord => r !== null && !!r.name);
  } catch (e) {
    console.error("[federal-mps]: fetch failed", e);
    return [];
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
