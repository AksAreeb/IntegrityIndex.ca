import axios from "axios";
import * as cheerio from "cheerio";

const CIEC_BASE = "https://prciec-rpccie.parl.gc.ca/EN/PublicRegistries/Pages";
const REGISTRY_LIST =
  "https://prciec-rpccie.parl.gc.ca/EN/PublicRegistries/Pages/PublicRegistryCode.aspx";
const DECLARATION_PAGE = `${CIEC_BASE}/Declaration.aspx`;

/** Official MP photo — 45th Parliament (primary). Use Member's House of Commons ID. */
export const OFFICIAL_MP_PHOTO_BASE_45 =
  "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMpPhotos/45";
/** Fallback when 45th photo 404s. */
export const OFFICIAL_MP_PHOTO_BASE_44 =
  "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMpPhotos/44";

/** Returns 45th Parliament photo URL for a federal MP. */
export function getMemberPhotoUrl(memberId: string): string {
  return `${OFFICIAL_MP_PHOTO_BASE_45}/${encodeURIComponent(memberId)}.jpg`;
}

/** Returns 44th Parliament fallback URL for a federal MP. */
export function getMemberPhotoUrl44(memberId: string): string {
  return `${OFFICIAL_MP_PHOTO_BASE_44}/${encodeURIComponent(memberId)}.jpg`;
}

export interface CIECAssetRow {
  assetName: string;
  natureOfInterest: string;
}

const AXIOS_OPTS = {
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
    Accept: "text/html",
    "Accept-Language": "en-CA,en;q=0.9",
  },
  maxRedirects: 3,
  validateStatus: (status: number) => status >= 200 && status < 400,
};

/**
 * Resolves a declaration ID (GUID) from the Public Registry by matching member name.
 * Fetches the registry listing and parses links to Declaration.aspx?DeclarationID=...
 */
async function resolveDeclarationIdByMemberName(
  memberName: string
): Promise<string | null> {
  try {
    const { data: html } = await axios.get<string>(REGISTRY_LIST, {
      ...AXIOS_OPTS,
      responseType: "text",
    });
    const $ = cheerio.load(html);
    const normalizedSearch = memberName.trim().toLowerCase();

    let foundId: string | null = null;
    const links = $('a[href*="Declaration.aspx"], a[href*="DeclarationID="]');
    for (let i = 0; i < links.length; i++) {
      const el = links[i];
      const href = $(el).attr("href") ?? "";
      const match = href.match(/DeclarationID=([a-fA-F0-9-]+)/);
      if (!match) continue;
      const linkText = $(el).text().trim();
      const rowText = $(el).closest("tr").text().trim();
      const textToMatch = `${linkText} ${rowText}`.toLowerCase();
      if (
        normalizedSearch.split(/\s+/).every((part) => part.length < 2 || textToMatch.includes(part))
      ) {
        foundId = match[1];
        break;
      }
    }
    if (foundId) return foundId;

    $("table tr, .ms-listviewtable tr, tr").each((_, tr) => {
      const $tr = $(tr);
      const link = $tr.find('a[href*="DeclarationID="]').first();
      const idMatch = link.attr("href")?.match(/DeclarationID=([a-fA-F0-9-]+)/);
      if (!idMatch) return;
      const cellText = $tr.text().trim().toLowerCase();
      if (normalizedSearch.split(/\s+/).every((part) => part.length < 2 || cellText.includes(part))) {
        foundId = idMatch[1];
      }
    });
    if (foundId) return foundId;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Scrapes a single declaration page by DeclarationID (GUID) and returns asset rows.
 */
async function scrapeDeclarationByGuid(declarationId: string): Promise<CIECAssetRow[]> {
  const url = `${DECLARATION_PAGE}?DeclarationID=${encodeURIComponent(declarationId)}`;
  const { data: html } = await axios.get<string>(url, { ...AXIOS_OPTS, responseType: "text" });
  const $ = cheerio.load(html);
  const rows: CIECAssetRow[] = [];

  $("table").each((_, table) => {
    const $table = $(table);
    const headerCells = $table.find("thead th, tr:first-child th, tr:first-child td");
    const headerTexts = headerCells
      .map((__, el) => $(el).text().trim().toLowerCase())
      .get();

    const assetNameIdx = headerTexts.findIndex(
      (t) => t.includes("asset") && t.includes("name")
    );
    const natureIdx = headerTexts.findIndex(
      (t) =>
        t.includes("nature") ||
        t.includes("interest") ||
        (t.includes("type") && headerTexts.some((h) => h.includes("interest")))
    );

    if (assetNameIdx === -1 || natureIdx === -1) return;

    const dataRows =
      $table.find("tbody tr").length > 0
        ? $table.find("tbody tr")
        : $table.find("tr").slice(1);

    dataRows.each((__, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < Math.max(assetNameIdx, natureIdx) + 1) return;
      const assetName = $(cells[assetNameIdx]).text().trim();
      const natureOfInterest = $(cells[natureIdx]).text().trim();
      if (assetName || natureOfInterest) {
        rows.push({ assetName, natureOfInterest });
      }
    });
  });

  if (rows.length === 0) {
    $("table tr").each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length >= 2) {
        const first = $(cells[0]).text().trim();
        const second = $(cells[1]).text().trim();
        if (first || second) rows.push({ assetName: first, natureOfInterest: second });
      }
    });
  }

  return rows;
}

/**
 * Search-based CIEC scrape: resolve declaration by member name from the Public Registry
 * landing page, then parse the declaration page. Falls back to direct DeclarationID=memberId
 * for backward compatibility if the registry listing does not match.
 */
export async function scrapeCIEC(memberNameOrId: string): Promise<CIECAssetRow[]> {
  const declarationId =
    (await resolveDeclarationIdByMemberName(memberNameOrId)) ?? memberNameOrId;

  try {
    return await scrapeDeclarationByGuid(declarationId);
  } catch {
    return [];
  }
}
