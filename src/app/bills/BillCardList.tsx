"use client";

import { useState } from "react";
import { getLinkedTickers, getSectorImpact } from "@/lib/bill-sectors";
import type { BillSummary } from "@/lib/fallback-data";

/** Minimal fallback when getBillSummary returns undefined; has plainLanguage only */
type BillSummaryFallback = { plainLanguage: string };

interface BillWithSummary {
  id: number;
  number: string;
  status: string;
  title: string;
  keyVote: boolean;
  summary: BillSummary | BillSummaryFallback | undefined;
  /** Member IDs with trade exposure in this bill's sector (for Stakeholder Warning) */
  stakeholderMemberIds?: string[];
}

function isFullBillSummary(s: BillSummary | BillSummaryFallback | undefined): s is BillSummary {
  return s != null && "publicInterestPoints" in s && Array.isArray((s as BillSummary).publicInterestPoints);
}

export function BillCardList({ bills }: { bills: BillWithSummary[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (bills.length === 0) {
    return (
      <div className="border border-[#E2E8F0] rounded-[4px] p-8 text-center">
        <p className="text-[#64748B]">No bills in database. Run seed to populate.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bills.map((bill) => {
        const isExpanded = expandedId === bill.id;
        const billText = [bill.title, bill.summary?.plainLanguage ?? ""].join(" ");
        const linkedTickers = getLinkedTickers(billText);
        const sectorImpact = getSectorImpact(billText);
        const summary = bill.summary;

        return (
          <div
            key={bill.id}
            className="border border-[#E2E8F0] rounded-[4px] overflow-hidden bg-white flex flex-col"
          >
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <h2 className="font-serif text-lg font-semibold text-[#0F172A]">
                  Bill {bill.number}
                </h2>
                <span className="flex gap-1.5 shrink-0">
                  {bill.keyVote && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[#0F172A] text-white rounded">
                      Key Vote
                    </span>
                  )}
                  {(bill.stakeholderMemberIds?.length ?? 0) > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-600 text-white rounded" title="Members hold stocks in this bill's sector">
                      Stakeholder Warning
                    </span>
                  )}
                </span>
              </div>
              {bill.title && (
                <p className="text-sm text-[#64748B] mb-3 line-clamp-2">{bill.title}</p>
              )}
              <p className="text-xs text-[#64748B] mb-4">Status: {bill.status || "—"}</p>

              {/* Summary (1–2 sentences) */}
              <div className="mb-2">
                <h3 className="text-xs font-serif font-semibold text-[#64748B] uppercase tracking-wide mb-1">Summary</h3>
                <p className="text-sm text-[#0F172A] leading-relaxed">
                  {summary?.plainLanguage ??
                    `Legislative proposal (${bill.number}). ${bill.title ? `Focus: ${bill.title.slice(0, 80)}…` : "Details in expanded view."}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : bill.id)}
                className="mt-auto text-sm font-sans font-medium text-[#0F172A] hover:underline"
              >
                {isExpanded ? "Less" : "More"}
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-[#E2E8F0] p-5 bg-[#F8FAFC] space-y-4">
                <div>
                  <h3 className="font-serif text-sm font-semibold text-[#0F172A] mb-2">
                    System Analysis
                  </h3>
                  <p className="text-xs text-[#64748B] mb-3">
                    Sector impact, linked tickers, and conflict detection for this bill.
                  </p>
                </div>
                <div>
                  <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-2">
                    Sector impact
                  </h4>
                  <ul className="list-disc list-inside text-sm text-[#64748B]">
                    {sectorImpact.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-2">
                    Linked tickers
                  </h4>
                  <p className="text-sm text-[#64748B]">
                    {linkedTickers.length > 0
                      ? linkedTickers.join(", ")
                      : "None identified"}
                  </p>
                </div>
                {(bill.stakeholderMemberIds?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-2">
                      Conflict detection
                    </h4>
                    <p className="text-sm text-[#64748B]">
                      {bill.stakeholderMemberIds!.length} member{bill.stakeholderMemberIds!.length !== 1 ? "s" : ""} with stock exposure in this bill&apos;s sector.
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-2">
                    Sponsor history
                  </h4>
                  <p className="text-sm text-[#64748B]">
                    Sponsor data is not yet linked to bills in the database. Check LEGISinfo for sponsor details.
                  </p>
                </div>
                {isFullBillSummary(summary) && (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-1">
                        Public interest
                      </h4>
                      <ul className="list-disc list-inside text-xs text-[#64748B]">
                        {summary.publicInterestPoints.slice(0, 2).map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-1">
                        Corporate interest
                      </h4>
                      <ul className="list-disc list-inside text-xs text-[#64748B]">
                        {summary.corporateInterestPoints.slice(0, 2).map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
