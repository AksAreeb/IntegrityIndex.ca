"use client";

import useSWR from "swr";

interface LiveTickerItem {
  memberName: string;
  riding: string;
  type: "BUY" | "SELL";
  symbol: string;
  memberId: string;
  date: string;
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  price?: number;
}

const FALLBACK_NOTICES = [
  "MP (Vaughan) - BUY: SHOP (Shopify) - $15k-$50k",
  "MPP (Ottawa) - SELL: ENB (Enbridge) - $1k-$15k",
  "MP (Calgary Centre) - BUY: SU (Suncor) - $50k-$100k",
  "MPP (Toronto Centre) - BUY: RY (Royal Bank) - $15k-$50k",
  "MP (Vancouver Quadra) - SELL: CNR (Canadian National) - $1k-$15k",
];

function formatItem(item: LiveTickerItem): string {
  const role = item.riding.toLowerCase().includes("riding")
    ? "MP"
    : item.memberId === "ontario"
      ? "MPP"
      : "MP";
  const base = `${role} (${item.riding}) - ${item.type}: ${item.symbol}`;
  const price = item.currentPrice ?? item.price;
  const changePercent = item.changePercent;
  if (price != null && changePercent != null) {
    const sign = changePercent >= 0 ? "+" : "";
    return `${base} | Now $${price.toFixed(2)} (${sign}${changePercent.toFixed(1)}%)`;
  }
  if (price != null) {
    return `${base} | Now $${price.toFixed(2)}`;
  }
  return base;
}

function buildTickerSegment(items: LiveTickerItem[]): string {
  return items.map(formatItem).join("  •  ").concat("  •  ");
}

function buildFallbackSegment(): string {
  return FALLBACK_NOTICES.join("  •  ").concat("  •  ");
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : { items: [] }));

export function IntegrityTicker() {
  const { data } = useSWR<{ items?: LiveTickerItem[] }>(
    "/api/trades",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const items = data?.items ?? [];
  const segment =
    items.length > 0 ? buildTickerSegment(items) : buildFallbackSegment();

  return (
    <div
      id="live-ledger-ticker"
      className="bg-[#F8FAFC] border-b border-[#E2E8F0] h-9 flex items-center overflow-hidden w-full"
      role="status"
      aria-live="polite"
      aria-label="Live trading and disclosure notices"
    >
      <div className="flex items-center min-w-max animate-ticker-scroll py-2">
        <span
          className="font-mono text-[11px] text-[#64748B] whitespace-nowrap px-4 inline-block"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {segment}
        </span>
        <span
          className="font-mono text-[11px] text-[#64748B] whitespace-nowrap px-4 inline-block"
          style={{ fontVariantNumeric: "tabular-nums" }}
          aria-hidden="true"
        >
          {segment}
        </span>
      </div>
    </div>
  );
}
