"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { getLinkedTickers, getSectorImpact } from "@/lib/bill-sectors";

export interface BillRow {
  number: string;
  status: string;
  title: string;
  keyVote: boolean;
  summary: { plainLanguage?: string } | null;
  stakeholderMemberIds: string[];
  stakeholderNames?: string[];
}

export function BillsDataTable({ bills }: { bills: BillRow[] }) {
  const [expandedNumber, setExpandedNumber] = useState<string | null>(null);

  if (bills.length === 0) {
    return (
      <div className="border border-[#E2E8F0] rounded-[4px] p-8 text-center">
        <p className="text-[#64748B]">No bills found. Try again later or run seed to sync from LEGISinfo.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">Number</th>
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">Title</th>
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">Status</th>
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A] w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const isExpanded = expandedNumber === bill.number;
              const billText = [bill.title, bill.summary?.plainLanguage ?? ""].join(" ");
              const sectorImpact = getSectorImpact(billText);
              const linkedTickers = getLinkedTickers(billText);
              return (
                <Fragment key={bill.number}>
                  <tr
                    key={bill.number}
                    className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  >
                    <td className="px-6 py-3 font-sans text-sm font-medium text-[#0F172A]">
                      {bill.keyVote && (
                        <span className="mr-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-[#0F172A] text-white rounded">
                          Key
                        </span>
                      )}
                      {bill.number}
                    </td>
                    <td className="px-6 py-3 font-sans text-sm text-[#0F172A] max-w-md">
                      {bill.title || "—"}
                    </td>
                    <td className="px-6 py-3 font-sans text-sm text-[#64748B]">
                      {bill.status || "—"}
                    </td>
                    <td className="px-6 py-3">
                        <button
                        type="button"
                        onClick={() => setExpandedNumber(isExpanded ? null : bill.number)}
                        className="text-sm font-sans font-medium text-[#0F172A] hover:underline"
                      >
                        {isExpanded ? "Hide" : "Analysis"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-1">System Analysis</h4>
                            <p className="font-sans text-sm text-[#0F172A] leading-relaxed">
                              {bill.summary?.plainLanguage ??
                                `Legislative proposal (${bill.number}). ${bill.title ? `Focus: ${bill.title.slice(0, 120)}…` : "No summary available."}`}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-1">Sector impact</h4>
                            <p className="font-sans text-sm text-[#64748B]">
                              {sectorImpact.length > 0 ? sectorImpact.join("; ") : "General"}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-1">Linked tickers</h4>
                            <p className="font-sans text-sm text-[#64748B]">
                              {linkedTickers.length > 0 ? linkedTickers.join(", ") : "None identified"}
                            </p>
                          </div>
                          {(bill.stakeholderMemberIds?.length ?? 0) > 0 && (
                            <div>
                              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase bg-[#B91C1C] text-white rounded mb-2">Stakeholder Warning</span>
                              <h4 className="font-serif text-xs font-semibold text-[#0F172A] mb-1">
                                Members with reported stock in this bill&apos;s sector
                              </h4>
                              <ul className="list-disc list-inside text-sm text-[#64748B]">
                                {((bill.stakeholderNames?.length ?? 0) > 0 ? bill.stakeholderNames! : bill.stakeholderMemberIds ?? []).map((nameOrId, i) => {
                                  const memberId = bill.stakeholderMemberIds?.[i] ?? null;
                                  const label = bill.stakeholderNames?.[i] ?? (typeof nameOrId === "string" ? nameOrId : String(nameOrId));
                                  if (!memberId || typeof memberId !== "string" || memberId.length === 0) {
                                    return <li key={i}>{label}</li>;
                                  }
                                  return (
                                    <li key={i}>
                                      <Link href={`/mps/${encodeURIComponent(memberId)}`} className="text-[#0F172A] hover:underline">
                                        {label}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
