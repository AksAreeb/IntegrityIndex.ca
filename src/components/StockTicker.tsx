"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import useSWR from "swr";
import { MemberPhoto } from "@/components/MemberPhoto";
import { StatusPulse } from "@/components/ui/StatusPulse";

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
  /** Disclosure date for "Disclosed: [Date]" label (YYYY-MM-DD). */
  disclosureDate: string;
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  party?: string;
  /** Public Interest Audit — High-Risk Conflict (shown in Gold) */
  isHighRiskConflict?: boolean;
  conflictReason?: string;
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

/** Format disclosure date: current year + within 6 months = no year; older = include year (Latest Available context). */
function formatDisclosureDate(disclosureDate: string): string {
  const d = new Date(disclosureDate + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return `Disclosed: ${disclosureDate}`;
  const now = new Date();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const isCurrentYear = d.getFullYear() === currentYear;
  const isWithinSixMonths = d >= sixMonthsAgo;
  const showYear = !isCurrentYear || !isWithinSixMonths;
  const formatted = showYear
    ? d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  return `Disclosed: ${formatted}`;
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
  }
  return fullName.slice(0, 20);
}

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("[StockTicker]: Fetch failed", res.status, res.statusText);
      return { items: [] };
    }
    return res.json();
  } catch (err) {
    console.error("[StockTicker]: Network error", err);
    return { items: [] };
  }
};

function StockTickerInner() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data, error, isLoading } = useSWR<{ items?: TickerItem[] }>(
    "/api/trades",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onSuccess: () => setLastUpdated(new Date()),
    }
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const items = data?.items ?? [];
  const isLive =
    lastUpdated != null && now - lastUpdated.getTime() < LIVE_THRESHOLD_MS;
  const showEmptyState = !isLoading && !error && items.length === 0;

  return (
    <div
      id="live-ledger-ticker"
      className="bg-[#F8FAFC] border-b border-[#E2E8F0] min-h-[52px] flex items-center overflow-hidden w-full min-w-0"
      role="status"
      aria-live="polite"
      aria-label="Live trading and disclosure notices"
    >
      {isLive && (
        <span className="flex-shrink-0 pl-3 pr-2">
          <StatusPulse
            label="Live"
            aria-label="Stock data is less than 15 minutes old"
          />
        </span>
      )}
      <div className="ticker-scroll-container flex-1 overflow-hidden min-w-0 cursor-default">
        <div className="flex items-center gap-6 min-w-max animate-ticker-scroll py-2">
        {error ? (
          <span className="font-mono text-[11px] text-amber-600 px-4">
            Live data currently unavailable
          </span>
        ) : isLoading ? (
          <span className="font-mono text-[11px] text-[#64748B] px-4 flex items-center gap-2" aria-busy="true">
            <span className="inline-block w-3 h-3 border-2 border-[#64748B]/30 border-t-[#64748B] rounded-full animate-spin" />
            Fetching latest 2026 disclosures...
          </span>
        ) : showEmptyState ? (
          <span className="font-mono text-[11px] text-[#64748B] px-4">
            No disclosures found. Check back for new 2026 data.
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
                  const borderClass = item.isHighRiskConflict
                    ? "border-l-[#B8860B]"
                    : getPartyBorder(item.party);
                  const isGold = !!item.isHighRiskConflict;
                  return (
                    <Link
                      key={`${item.memberId}-${item.symbol}-${item.dateIso}-${repeat}`}
                      href={`/member/${encodeURIComponent(item.memberId)}`}
                      className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full bg-white border border-[#E2E8F0] border-l-4 ${borderClass} hover:shadow-sm transition-shadow min-w-[280px] ${isGold ? "ring-1 ring-amber-300/50" : ""}`}
                      title={item.conflictReason}
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
                      <span className={`font-sans text-[11px] whitespace-nowrap ${isGold ? "text-[#8B6914]" : "text-[#0F172A]"}`}>
                        {isGold && (
                          <span className="text-[#B8860B] font-semibold mr-1" aria-label="Public Interest Audit">◆</span>
                        )}
                        <span className="font-medium">{shortName(item.memberName)}</span>{" "}
                        {action} {item.symbol} @ {price} • {formatDisclosureDate(item.disclosureDate ?? item.date)}
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
    </div>
  );
}

export const StockTicker = memo(StockTickerInner);
