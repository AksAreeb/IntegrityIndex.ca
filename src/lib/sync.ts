/**
 * Federal roster sync: OurCommons 45th Parliament (343 MPs) + fallback to local JSON.
 * Tries CSV export, then JSON export, then public/members_safe_roster.json.
 */

import axios from "axios";
import { readFileSync } from "fs";
import path from "path";
import { logger } from "@/lib/logger";

/** 45th Parliament (2025+) has 343 seats; 338 = 44th Parliament archive. */
export const FEDERAL_MP_COUNT_45TH = 343;

const FEDERAL_MEMBERS_CSV =
  "https://www.ourcommons.ca/members/en/search/csv";
const FEDERAL_MEMBERS_JSON =
  "https://www.ourcommons.ca/en/members/export/json";

export interface FederalMpRecord {
  id: string;
  name: string;
  riding: string;
  party: string;
}

const SAFE_ROSTER_PATH = path.join(
  process.cwd(),
  "public",
  "members_safe_roster.json"
);

const AXIOS_OPTS = {
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
  },
  validateStatus: (s: number) => s >= 200 && s < 400,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Normalize value: "(not available)" or empty must not be sent to Prisma (causes column error). */
function normalizeMemberString(value: string, defaultVal: string): string {
  const s = (value ?? "").trim();
  if (!s || s === "(not available)" || s.toLowerCase() === "(not available)") return defaultVal;
  return s;
}

/**
 * Parses OurCommons-style CSV (header row + data). Tolerates columns: Name, Constituency, Party, etc.
 */
export function parseFederalMembersFromCsv(csvText: string): FederalMpRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerRow = lines[0].split(",").map((c) => c.replace(/^"|"$/g, "").trim().toLowerCase());
  const findCol = (...keys: string[]) => {
    for (const k of keys) {
      const i = headerRow.findIndex((h) => h.includes(k));
      if (i >= 0) return i;
    }
    return -1;
  };
  const nameIdx = findCol("name", "person") >= 0 ? findCol("name", "person") : 0;
  const ridingIdx = findCol("constituency", "riding") >= 0 ? findCol("constituency", "riding") : 1;
  const partyCol = findCol("party", "caucus", "caucus short name");
  const partyIdx = partyCol >= 0 ? partyCol : -1;
  const idIdx = findCol("officialid", "id");

  const rows: FederalMpRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
    const rawName = (parts[nameIdx] ?? "").trim();
    if (!rawName) continue;
    const name = normalizeMemberString(rawName, "Unknown");
    const riding = normalizeMemberString((parts[ridingIdx] ?? "").trim(), "Unknown");
    const rawParty = partyIdx >= 0 ? (parts[partyIdx] ?? "").trim() : "";
    const party = normalizeMemberString(
      rawParty && rawParty !== name ? rawParty : "Independent",
      "Independent"
    );
    const id = idIdx >= 0 && parts[idIdx] ? String(parts[idIdx]).trim() : "";
    rows.push({
      id: id || slugify(name + riding),
      name: name || "Unknown",
      riding: riding || "Unknown",
      party: party || "Independent",
    });
  }
  return rows;
}

/**
 * Polymorphic parser: accepts root key Items, items, or a flat array.
 * Normalizes field names (case-insensitive: OfficialId/officialId, PersonShortName/personShortName, etc.).
 */
export function parseFederalMembersFromJson(data: unknown): FederalMpRecord[] {
  if (data == null) return [];

  let raw: unknown[] = [];
  if (Array.isArray(data)) {
    raw = data;
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    raw =
      (Array.isArray(obj.Items) ? obj.Items : null) ??
      (Array.isArray(obj.items) ? obj.items : null) ??
      (Array.isArray(obj.members) ? obj.members : null) ??
      (Array.isArray(obj.Members) ? obj.Members : null) ??
      [];
  }

  return raw
    .map((m: unknown) => {
      if (m == null || typeof m !== "object") return null;
      const row = m as Record<string, unknown>;
      const id = String(
        row.OfficialId ?? row.officialId ?? row.Id ?? row.id ?? ""
      ).trim();
      const name = normalizeMemberString(
        String(
          row.PersonShortName ??
            row.personShortName ??
            row.Name ??
            row.name ??
            ""
        ),
        "Unknown"
      );
      const riding = normalizeMemberString(
        String(
          row.ConstituencyName ??
            row.constituencyName ??
            row.Riding ??
            row.riding ??
            ""
        ),
        "Unknown"
      );
      const rawParty = String(
        row.CaucusShortName ??
          row.caucusShortName ??
          row.Party ??
          row.party ??
          ""
      ).trim();
      const party = normalizeMemberString(
        rawParty && rawParty !== name ? rawParty : "Independent",
        "Independent"
      );
      if (!id && !name) return null;
      return {
        id: id || slugify(name + riding),
        name: name || "Unknown",
        riding: riding || "Unknown",
        party: party || "Independent",
      };
    })
    .filter((r): r is FederalMpRecord => r !== null && !!r.name);
}

function validateParliamentCount(parsed: FederalMpRecord[], source: string): FederalMpRecord[] {
  if (parsed.length === 338) {
    logger.warn(
      "[sync] Got 338 members — likely 44th Parliament (2021–2025) archive. 45th Parliament has 343 seats."
    );
  } else if (parsed.length >= FEDERAL_MP_COUNT_45TH) {
    logger.info(`[sync] ${source}: ${parsed.length} members (45th Parliament target 343).`);
  }
  return parsed;
}

/**
 * Fetches federal MPs: tries CSV export, then JSON export, then public/members_safe_roster.json.
 * Validates 343 = 45th Parliament; 338 = 44th Parliament archive.
 */
export async function fetchFederalMembers(): Promise<FederalMpRecord[]> {
  // 1. Try CSV (45th Parliament search export)
  try {
    const { data } = await axios.get<string>(FEDERAL_MEMBERS_CSV, {
      ...AXIOS_OPTS,
      headers: { ...AXIOS_OPTS.headers, Accept: "text/csv" },
      responseType: "text",
    });
    const parsed = parseFederalMembersFromCsv(typeof data === "string" ? data : String(data));
    if (parsed.length > 0) return validateParliamentCount(parsed, "CSV");
  } catch (e) {
    logger.warn("[sync] CSV export failed:", e instanceof Error ? e.message : "request failed");
  }

  // 2. Try JSON export
  try {
    const { data } = await axios.get<unknown>(FEDERAL_MEMBERS_JSON, {
      ...AXIOS_OPTS,
      headers: { ...AXIOS_OPTS.headers, Accept: "application/json" },
    });
    const parsed = parseFederalMembersFromJson(data);
    if (parsed.length > 0) return validateParliamentCount(parsed, "JSON");
  } catch (e) {
    logger.warn("[sync] JSON export failed:", e instanceof Error ? e.message : "request failed");
  }

  // 3. Fallback: public/members_safe_roster.json (populate with 343 MPs if export unavailable)
  try {
    const buf = readFileSync(SAFE_ROSTER_PATH, "utf-8");
    const json = JSON.parse(buf) as unknown;
    const fallback = parseFederalMembersFromJson(json);
    if (fallback.length > 0) {
      logger.warn(
        "[sync] Using fallback roster (public/members_safe_roster.json). Add 343 MPs for 45th Parliament if needed."
      );
      return validateParliamentCount(fallback, "fallback");
    }
  } catch (e) {
    logger.error(
      "[sync] Fallback roster read failed:",
      e instanceof Error ? e.message : "read failed"
    );
  }
  return [];
}
