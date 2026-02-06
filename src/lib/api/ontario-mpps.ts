import axios from "axios";

const OLA_MEMBERS_JSON =
  "https://www.ola.org/en/members/current/export/json";

export interface OntarioMppRecord {
  id: string;
  name: string;
  riding: string;
  party: string;
}

/**
 * Fetches current Ontario MPPs from the Legislative Assembly of Ontario
 * export JSON. Returns records suitable for upsert into Member with
 * jurisdiction PROVINCIAL and chamber Legislative Assembly.
 */
export async function fetchOntarioMpps(): Promise<OntarioMppRecord[]> {
  try {
    const { data } = await axios.get<{
      [key: string]: unknown;
      members?: Array<{
        id?: string | number;
        name?: string;
        riding?: string;
        party?: string;
        [key: string]: unknown;
      }>;
    }>(OLA_MEMBERS_JSON, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
        Accept: "application/json",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const raw = Array.isArray(data) ? data : data?.members ?? data?.Members ?? [];
    const list = Array.isArray(raw) ? raw : [];

    return list
      .map((m: Record<string, unknown>) => {
        const id = String(m.id ?? m.MemberId ?? m.memberId ?? "").trim();
        const name = String(m.name ?? m.Name ?? m.fullName ?? "").trim();
        const riding = String(m.riding ?? m.Riding ?? m.constituency ?? "").trim();
        const party = String(m.party ?? m.Party ?? "").trim();
        if (!id && !name) return null;
        return {
          id: id || slugify(name),
          name: name || "Unknown",
          riding: riding || "Unknown",
          party: party || "Independent",
        };
      })
      .filter((r): r is OntarioMppRecord => r !== null && !!r.name);
  } catch {
    return [];
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
