import axios from "axios";
import * as cheerio from "cheerio";

const CIEC_BASE = "https://prciec-rpccie.parl.gc.ca/";
const CIEC_PAGES = "https://prciec-rpccie.parl.gc.ca/EN/PublicRegistries/Pages";
/** Current parliament (45th) registry — primary source. */
const REGISTRY_LIST =
  "https://prciec-rpccie.parl.gc.ca/EN/PublicRegistries/Pages/PublicRegistryCode.aspx";
/** Fallback when current registry returns 0: All Results / broader listing. */
const REGISTRY_ARCHIVE_OR_PREVIOUS =
  "https://prciec-rpccie.parl.gc.ca/EN/PublicRegistries/Pages/PublicRegistry.aspx";
const DECLARATION_PAGE = `${CIEC_PAGES}/Declaration.aspx`;

/** Official MP photo — 45th Parliament (primary). Use Member's House of Commons ID. */
export const OFFICIAL_MP_PHOTO_BASE_45 =
  "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMpPhotos/45";
/** Fallback when 45th photo 404s (e.g. members from previous parliament). */
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
  /** When present, save into TradeTicker.date (disclosure date). Parsed from CIEC table. */
  date_disclosed?: string;
  /** True when natureOfInterest indicates a Material Change (trade disclosure). */
  isMaterialChange?: boolean;
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
 * Parses a registry HTML page for a declaration ID matching member name.
 * Returns first DeclarationID=... GUID that matches the name.
 */
function parseRegistryHtmlForMember(html: string, memberName: string): string | null {
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
  return foundId;
}

/**
 * Resolves a declaration ID (GUID) from the Public Registry by matching member name.
 * Tries current 45th Parliament registry first; if 0 results, tries Archive/Previous Parliament listing.
 */
async function resolveDeclarationIdByMemberName(
  memberName: string
): Promise<string | null> {
  const urlsToTry = [REGISTRY_LIST, REGISTRY_ARCHIVE_OR_PREVIOUS];
  for (const url of urlsToTry) {
    try {
      const { data: html } = await axios.get<string>(url, {
        ...AXIOS_OPTS,
        responseType: "text",
      });
      const foundId = parseRegistryHtmlForMember(html, memberName);
      if (foundId) {
        if (url === REGISTRY_ARCHIVE_OR_PREVIOUS) {
          console.log("[ciecScraper] Resolved declaration via Archive/Previous Parliament listing.");
        }
        return foundId;
      }
    } catch (e) {
      console.warn("[ciecScraper] Registry fetch failed for", url, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** Parse CIEC date cell (e.g. "2025-01-15" or "15/01/2025") to YYYY-MM-DD. */
function parseDateDisclosed(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const mdy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return undefined;
}

/** True if nature of interest indicates a Material Change (trade disclosure). */
function isMaterialChange(nature: string): boolean {
  const n = nature.toLowerCase();
  return n.includes("material change") || n.includes("material change in assets") || n.includes("transaction") || n.includes("purchase") || n.includes("sale");
}

/** Heuristic: asset name that looks like a ticker symbol (2–5 letters). Export for sync. */
export function looksLikeTickerSymbol(assetName: string): boolean {
  const t = assetName.trim().toUpperCase();
  return /^[A-Z]{2,5}$/.test(t) && t.length >= 2;
}

/**
 * Scrapes a single declaration page by DeclarationID (GUID) and returns asset rows.
 * Parses date_disclosed when table has a date column; sets isMaterialChange for trade-like rows.
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
    const dateIdx = headerTexts.findIndex(
      (t) => t.includes("date") || t.includes("disclosed") || t.includes("change")
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
      const dateRaw = dateIdx >= 0 && cells.length > dateIdx ? $(cells[dateIdx]).text().trim() : "";
      const date_disclosed = parseDateDisclosed(dateRaw);
      const isMaterialChangeRow = isMaterialChange(natureOfInterest);
      if (assetName || natureOfInterest) {
        rows.push({
          assetName,
          natureOfInterest,
          ...(date_disclosed && { date_disclosed }),
          ...(isMaterialChangeRow && { isMaterialChange: true }),
        });
      }
    });
  });

  if (rows.length === 0) {
    $("table tr").each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length >= 2) {
        const first = $(cells[0]).text().trim();
        const second = $(cells[1]).text().trim();
        const isMC = isMaterialChange(second);
        rows.push({
          assetName: first,
          natureOfInterest: second,
          ...(isMC && { isMaterialChange: true }),
        });
      }
    });
  }

  return rows;
}

export interface CIECDryRunResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  url: string;
}

/**
 * Dry run: verify the app can reach the CIEC website (https://prciec-rpccie.parl.gc.ca/).
 * Call from GET /api/sync?dryRun=ciec to confirm connectivity before running the full scraper.
 */
export async function dryRunCIEC(): Promise<CIECDryRunResult> {
  const url = CIEC_BASE;
  try {
    const res = await axios.get(url, {
      ...AXIOS_OPTS,
      responseType: "text",
      maxRedirects: 5,
      validateStatus: () => true,
    });
    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      statusText: res.statusText,
      url,
    };
  } catch (e) {
    const axiosErr = e as {
      response?: { status?: number; statusText?: string };
      message?: string;
    };
    return {
      ok: false,
      status: axiosErr.response?.status,
      statusText: axiosErr.response?.statusText,
      error: axiosErr.message ?? String(e),
      url,
    };
  }
}

/**
 * Search-based CIEC scrape: resolve declaration by member name from the Public Registry
 * (45th Parliament). Returns asset rows with optional date_disclosed and isMaterialChange.
 */
export async function scrapeCIEC(memberNameOrId: string): Promise<CIECAssetRow[]> {
  const declarationId =
    (await resolveDeclarationIdByMemberName(memberNameOrId)) ?? memberNameOrId;

  try {
    const rows = await scrapeDeclarationByGuid(declarationId);
    const materialChanges = rows.filter((r) => r.isMaterialChange);
    console.log(
      `[ciecScraper] Declaration ${declarationId.slice(0, 8)}...: found ${rows.length} asset rows, ${materialChanges.length} material change(s)`
    );
    return rows;
  } catch (e) {
    console.error("[ciecScraper]: scrapeDeclarationByGuid failed", e);
    return [];
  }
}
