import axios from "axios";
import * as cheerio from "cheerio";

const CIEC_BASE =
  "https://ciec-ccie.parl.gc.ca/en/public-registries/Pages/Declaration.aspx";

export interface CIECAssetRow {
  assetName: string;
  natureOfInterest: string;
}

/**
 * Scrapes the CIEC public declaration page for a given member/declaration ID.
 * Extracts the "Summary of Assets" table: Asset Name and Nature of Interest.
 * Target: Declaration.aspx?DeclarationID= (memberId is used as DeclarationID).
 */
export async function scrapeCIEC(memberId: string): Promise<CIECAssetRow[]> {
  const url = `${CIEC_BASE}?DeclarationID=${encodeURIComponent(memberId)}`;
  const { data: html } = await axios.get<string>(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
      Accept: "text/html",
      "Accept-Language": "en-CA,en;q=0.9",
    },
    maxRedirects: 3,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const $ = cheerio.load(html);
  const rows: CIECAssetRow[] = [];

  // Find tables and look for "Summary of Assets" (or similar) by header text
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

  // Fallback: any table with two columns that look like asset / nature
  if (rows.length === 0) {
    $("table tr").each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length >= 2) {
        const first = $(cells[0]).text().trim();
        const second = $(cells[1]).text().trim();
        if (first || second)
          rows.push({ assetName: first, natureOfInterest: second });
      }
    });
  }

  return rows;
}
