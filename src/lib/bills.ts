/**
 * Bill parser for 45th Parliament LEGISinfo API (shape-shifting safe) and contextual summary generator.
 */

export interface BillRecord {
  number: string;
  status: string;
  title?: string;
  longTitle?: string;
  isKeyVote?: boolean;
}

/** Case-insensitive field getter for a single bill item. */
function getStr(item: Record<string, unknown>, ...keys: string[]): string {
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [k, v] of Object.entries(item)) {
    if (v != null && typeof v === "string" && lowerKeys.includes(k.toLowerCase()))
      return v.trim();
  }
  return "";
}

/**
 * Defensive parser for 45th Parliament LEGISinfo response.
 * Handles root key Items, items, or flat array; nested Items; bill.Number and bill.number (case-insensitive).
 */
export function parseBillsFromLegisinfoResponse(data: unknown): BillRecord[] {
  if (data == null) return [];

  let raw: unknown[] = [];
  if (Array.isArray(data)) {
    raw = data;
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    raw =
      (Array.isArray(obj.Items) ? obj.Items : null) ??
      (Array.isArray(obj.items) ? obj.items : null) ??
      (Array.isArray(obj.bills) ? obj.bills : null) ??
      [];
    if (raw.length > 0 && raw.some((x) => x != null && typeof x === "object" && "Items" in (x as object))) {
      const nested = raw.flatMap((x) => {
        const item = x as Record<string, unknown>;
        const inner = item.Items ?? item.items;
        return Array.isArray(inner) ? inner : [x];
      });
      raw = nested;
    }
  }

  const bills: BillRecord[] = [];
  for (const x of raw) {
    if (x == null || typeof x !== "object") continue;
    const item = x as Record<string, unknown>;
    const number = getStr(
      item,
      "Number",
      "number",
      "BillNumber",
      "billNumber"
    );
    if (!number) continue;
    const status = getStr(
      item,
      "Status",
      "status",
      "CurrentStatus",
      "currentStatus"
    );
    const title = getStr(
      item,
      "ShortTitle",
      "shortTitle",
      "Title",
      "title"
    ) || undefined;
    const longTitle = getStr(
      item,
      "LongTitle",
      "longTitle",
      "FullTitle",
      "fullTitle"
    ) || undefined;
    bills.push({
      number,
      status,
      title: title || undefined,
      longTitle: longTitle || undefined,
      isKeyVote: isKeyVoteBill(number),
    });
  }
  return bills;
}

const KEY_VOTE_BILL_NUMBERS = new Set([
  "C-11",
  "C-18",
  "C-27",
  "C-21",
  "S-5",
  "Bill 23",
  "Bill 97",
  "Bill 124",
]);

export function isKeyVoteBill(billNumber: string): boolean {
  return KEY_VOTE_BILL_NUMBERS.has(billNumber.trim());
}

/**
 * Contextual generator when no live LEGISinfo summary exists.
 * Produces a human-readable string from LongTitle and Sector.
 */
export function getContextualBillSummary(
  bill: { number: string; title?: string; longTitle?: string },
  sector?: string
): string {
  const title =
    bill.longTitle?.trim() ||
    bill.title?.trim() ||
    `Bill ${bill.number}`;
  const sectorPhrase = sector && sector !== "General" ? ` regarding ${sector}` : "";
  return `A legislative act${sectorPhrase} introduced in the 45th Parliament. ${title.slice(0, 200)}${title.length > 200 ? "…" : ""}`;
}
