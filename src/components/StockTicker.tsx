"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { MemberPhoto } from "@/components/MemberPhoto";

const LIVE_THRESHOLD_MS = 15 * 60 * 1000;

export interface TickerItem {
  memberName: string;
  memberPhotoUrl: string | null;
  jurisdiction?: string;
  riding: string;
  type: "BUY" | "SELL";
  symbol: string;
  memberId: string;
  date: string;
  dateIso: string;
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  party?: string;
}

const PARTY_BORDER: Record<string, string> = {
  Conservative: "border-l-[#1E3A8A]",
  Liberal: "border-l-[#B91C1C]",
  NDP: "border-l-[#EA580C]",
  "Bloc Québécois": "border-l-[#0284C7]",
  Bloc: "border-l-[#0284C7]",
  Green: "border-l-[#15803D]",
};
const DEFAULT_BORDER = "border-l-[#64748B]";

function getPartyBorder(party?: string): string {
  if (!party) return DEFAULT_BORDER;
  return PARTY_BORDER[party] ?? DEFAULT_BORDER;
}

function relativeTime(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
  }
  return fullName.slice(0, 20);
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : { items: [] }));

export function StockTicker() {
  const { data, dataUpdatedAt } = useSWR<{ items?: TickerItem[] }>(
    "/api/trades",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true, revalidateOnReconnect: true }
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const items = data?.items ?? [];
  const isLive =
    dataUpdatedAt != null && now - dataUpdatedAt < LIVE_THRESHOLD_MS;

  return (
    <div
      id="live-ledger-ticker"
      className="bg-[#F8FAFC] border-b border-[#E2E8F0] min-h-[52px] flex items-center overflow-hidden w-full"
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
      <div className="flex items-center gap-6 min-w-max animate-ticker-scroll py-2 flex-1 overflow-hidden">
        {items.length === 0 ? (
          <span className="font-mono text-[11px] text-[#64748B] px-4">
            Awaiting next CIEC filing update...
          </span>
        ) : (
          <>
            {[0, 1].map((repeat) => (
              <span key={repeat} className="flex items-center gap-6">
                {items.map((item) => {
                  const price =
                    item.currentPrice != null
                      ? `$${item.currentPrice.toFixed(2)}`
                      : "—";
                  const action = item.type === "BUY" ? "bought" : "sold";
                  const borderClass = getPartyBorder(item.party);
                  return (
                    <Link
                      key={`${item.memberId}-${item.symbol}-${item.dateIso}-${repeat}`}
                      href={`/mps/${encodeURIComponent(item.memberId)}`}
                      className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full bg-white border border-[#E2E8F0] border-l-4 ${borderClass} hover:shadow-sm transition-shadow min-w-[280px]`}
                    >
                      <span className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[#F1F5F9]">
                        <MemberPhoto
                          member={{
                            id: item.memberId,
                            jurisdiction: item.jurisdiction ?? "FEDERAL",
                            photoUrl: item.memberPhotoUrl,
                          }}
                          width={32}
                          height={32}
                          alt={item.memberName}
                        />
                      </span>
                      <span className="font-sans text-[11px] text-[#0F172A] whitespace-nowrap">
                        <span className="font-medium">{shortName(item.memberName)}</span>{" "}
                        {action} {item.symbol} @ {price} • {relativeTime(item.dateIso)}
                      </span>
                    </Link>
                  );
                })}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
