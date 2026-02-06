"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import useSWR from "swr";
import { MemberPhoto } from "@/components/MemberPhoto";

const LIVE_THRESHOLD_MS = 15 * 60 * 1000;

export interface PulseItem {
  id: string;
  type: "trade" | "disclosure";
  memberId: string;
  memberName: string;
  memberPhotoUrl: string | null;
  jurisdiction: string;
  riding: string;
  party?: string;
  symbol?: string;
  tradeType?: "BUY" | "SELL";
  date: string;
  dateIso: string;
  disclosureDate: string;
  isHighRiskConflict: boolean;
  conflictReason?: string;
  currentPrice?: number;
  dailyChange?: number;
  changePercent?: number;
  category?: string;
  description?: string;
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

function formatDisclosureDate(disclosureDate: string): string {
  const d = new Date(disclosureDate + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return disclosureDate;
  const now = new Date();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const showYear =
    d.getFullYear() !== currentYear || d < sixMonthsAgo;
  return showYear
    ? d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
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
    const res = await fetch(url);
    if (!res.ok) return { items: [] };
    return res.json();
  } catch {
    return { items: [] };
  }
};

function PulseFeedInner() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data, error, isLoading } = useSWR<{ items?: PulseItem[] }>(
    "/api/pulse",
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
    <section
      className="border-b border-slate-200 bg-[#FAFBFC]"
      aria-labelledby="pulse-feed-heading"
    >
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="pulse-feed-heading"
            className="font-serif text-xl font-bold text-[#0F172A]"
          >
            The Pulse
          </h2>
          {isLive && (
            <span
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600"
              aria-label="Data is less than 15 minutes old"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {error ? (
          <p className="font-sans text-sm text-amber-600">
            Live data currently unavailable
          </p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-[#64748B] font-sans text-sm" aria-busy="true">
            <span className="inline-block w-3 h-3 border-2 border-[#64748B]/30 border-t-[#64748B] rounded-full animate-spin" />
            Loading activity feed...
          </div>
        ) : showEmptyState ? (
          <p className="font-sans text-sm text-[#64748B]">
            No activity yet. Run seed or sync to populate.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const borderClass = getPartyBorder(item.party);
              const isHighRisk = item.isHighRiskConflict;
              const price =
                item.currentPrice != null
                  ? `$${item.currentPrice.toFixed(2)}`
                  : "—";

              return (
                <Link
                  key={item.id}
                  href={`/member/${encodeURIComponent(item.memberId)}`}
                  className={`
                    relative flex flex-col gap-2 p-3 rounded-lg border bg-white
                    border-l-4 ${borderClass}
                    hover:shadow-md transition-all
                    ${isHighRisk ? "ring-1 ring-amber-200/60" : ""}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`relative flex-shrink-0 w-10 h-10 rounded-full bg-[#F1F5F9] ${isHighRisk ? "overflow-visible" : "overflow-hidden"}`}
                    >
                      {isHighRisk && (
                        <span
                          className="absolute inset-0 z-10 animate-pulse-ring rounded-full"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-0 block w-full h-full overflow-hidden rounded-full">
                        <MemberPhoto
                          member={{
                            id: item.memberId,
                            jurisdiction: item.jurisdiction ?? "FEDERAL",
                            photoUrl: item.memberPhotoUrl,
                          }}
                          width={40}
                          height={40}
                          alt={item.memberName}
                        />
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-medium text-[#0F172A]">
                        {shortName(item.memberName)}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {item.riding}
                        {item.party ? ` · ${item.party}` : ""}
                      </p>
                    </div>
                  </div>

                  {item.type === "trade" && (
                    <p className="font-sans text-xs text-[#0F172A]">
                      {item.tradeType === "BUY" ? "Bought" : "Sold"} {item.symbol}{" "}
                      @ {price}
                    </p>
                  )}
                  {item.type === "disclosure" && item.description && (
                    <p className="font-sans text-xs text-[#0F172A] truncate">
                      {item.description}
                    </p>
                  )}

                  {isHighRisk && item.conflictReason && (
                    <div
                      className="mt-1 px-2 py-1.5 rounded bg-amber-50 border border-amber-200/80"
                      role="status"
                      aria-label={`High-Risk Conflict: ${item.conflictReason}`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        High-Risk Conflict
                      </span>
                      <p className="font-sans text-[11px] text-amber-900 mt-0.5">
                        {item.conflictReason}
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-[#94A3B8]">
                    {formatDisclosureDate(item.disclosureDate ?? item.date)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export const PulseFeed = memo(PulseFeedInner);
