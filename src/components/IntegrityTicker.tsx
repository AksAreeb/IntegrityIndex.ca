"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

const LIVE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

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

const EMPTY_MESSAGE = "Awaiting next CIEC filing update...";

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

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : { items: [] }));

export function IntegrityTicker() {
  const { data, dataUpdatedAt } = useSWR<{ items?: LiveTickerItem[] }>(
    "/api/trades",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const items = data?.items ?? [];
  const segment =
    items.length > 0 ? buildTickerSegment(items) : EMPTY_MESSAGE;

  const isLive =
    dataUpdatedAt != null && now - dataUpdatedAt < LIVE_THRESHOLD_MS;

  return (
    <div
      id="live-ledger-ticker"
      className="bg-[#F8FAFC] border-b border-[#E2E8F0] h-9 flex items-center overflow-hidden w-full"
      role="status"
      aria-live="polite"
      aria-label="Live trading and disclosure notices"
    >
      {isLive && (
        <span
          className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2 text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-600"
          aria-label="Stock data is less than 15 minutes old"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      )}
      <div className="flex items-center min-w-max animate-ticker-scroll py-2 flex-1 overflow-hidden">
        {items.length > 0 ? (
          [0, 1].map((i) => (
            <span
              key={i}
              className="font-mono text-[11px] text-[#64748B] whitespace-nowrap px-4 inline-block"
              style={{ fontVariantNumeric: "tabular-nums" }}
              aria-hidden={i > 0}
            >
              {segment}
            </span>
          ))
        ) : (
          <span className="font-mono text-[11px] text-[#64748B] px-4">
            {segment}
          </span>
        )}
      </div>
    </div>
  );
}
