import axios from "axios";

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

/** Common Canadian ticker symbols to filter noise when extracting from disclosure text */
const KNOWN_TICKERS = new Set([
  "TD", "RY", "BNS", "BMO", "CM", "NA", "SHOP", "ENB", "TRP", "SU", "CNQ", "CNR", "CP", "CPG",
  "AQN", "FTS", "EMA", "XIU", "XIC", "VCN", "VCE", "ZEB", "ZWB", "AAPL", "MSFT", "GOOGL", "AMZN",
]);

/**
 * Extracts likely stock ticker symbols from disclosure/asset text (e.g. "TD Bank", "Shopify SHOP").
 * Returns unique uppercase symbols, optionally filtered to known tickers only.
 */
export function extractTickerSymbolsFromText(
  text: string,
  onlyKnown = false
): string[] {
  const upper = (text ?? "").toUpperCase();
  const matches = upper.matchAll(/\b([A-Z]{2,5})\b/g);
  const seen = new Set<string>();
  for (const m of matches) {
    const sym = m[1];
    if (sym.length >= 2 && (!onlyKnown || KNOWN_TICKERS.has(sym))) {
      seen.add(sym);
    }
  }
  return Array.from(seen);
}

export interface LiveStockPriceResult {
  currentPrice: number;
  dailyChange: number;
}

export interface LivePriceResult {
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
}

/**
 * Uses FINNHUB_API_KEY from environment. Returns current price (c) and daily change (d).
 */
export async function getLiveStockPrice(
  symbol: string
): Promise<LiveStockPriceResult | null> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return null;

  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;

  try {
    const url = `${FINNHUB_QUOTE_URL}?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(token)}`;
    const { data } = await axios.get<{ c?: number; d?: number; pc?: number }>(url, {
      timeout: 8000,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const currentPrice = data.c ?? data.pc ?? 0;
    const dailyChange = data.d ?? 0;
    if (currentPrice <= 0) return null;

    return { currentPrice, dailyChange };
  } catch (e) {
    console.error("[stocks]: getLiveStockPrice failed", e);
    return null;
  }
}

/**
 * Fetches current market price and 24h change; uses getLiveStockPrice and adds changePercent.
 */
export async function getLivePrice(
  ticker: string
): Promise<LivePriceResult | null> {
  const result = await getLiveStockPrice(ticker);
  if (!result) return null;

  const { currentPrice, dailyChange } = result;
  const previousClose = currentPrice - dailyChange;
  const changePercent =
    previousClose > 0 ? (dailyChange / previousClose) * 100 : 0;

  return {
    price: currentPrice,
    change: dailyChange,
    changePercent,
    previousClose,
  };
}
