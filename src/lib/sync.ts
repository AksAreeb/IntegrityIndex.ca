/**
 * Federal roster sync: polymorphic parser for ourcommons export + fallback to local JSON.
 * Used by GET /api/sync and optionally by scripts.
 */

import axios from "axios";
import { readFileSync } from "fs";
import path from "path";
import { logger } from "@/lib/logger";

const FEDERAL_MEMBERS_EXPORT =
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
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
      const name = String(
        row.PersonShortName ??
          row.personShortName ??
          row.Name ??
          row.name ??
          ""
      ).trim();
      const riding = String(
        row.ConstituencyName ??
          row.constituencyName ??
          row.Riding ??
          row.riding ??
          ""
      ).trim();
      const party = String(
        row.CaucusShortName ??
          row.caucusShortName ??
          row.Party ??
          row.party ??
          ""
      ).trim();
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

/**
 * Fetches federal MPs from the House of Commons export.
 * On 404 or parse failure, falls back to public/members_safe_roster.json and logs a high-priority warning.
 */
export async function fetchFederalMembers(): Promise<FederalMpRecord[]> {
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

    const parsed = parseFederalMembersFromJson(data);
    if (parsed.length > 0) return parsed;
  } catch (e) {
    logger.warn(
      "[sync] Federal export failed:",
      e instanceof Error ? e.message : "request failed"
    );
  }

  try {
    const buf = readFileSync(SAFE_ROSTER_PATH, "utf-8");
    const json = JSON.parse(buf) as unknown;
    const fallback = parseFederalMembersFromJson(json);
    logger.warn(
      "[sync] Using fallback roster (public/members_safe_roster.json). Federal export unavailable or returned no data."
    );
    return fallback;
  } catch (e) {
    logger.error(
      "[sync] Fallback roster read failed:",
      e instanceof Error ? e.message : "read failed"
    );
    return [];
  }
}
