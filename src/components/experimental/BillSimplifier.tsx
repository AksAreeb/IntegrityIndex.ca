"use client";

import { useState } from "react";
import { BILL_SUMMARIES, getBillSummary } from "@/lib/mock-data";

export function BillSimplifier() {
  const [selectedBillId, setSelectedBillId] = useState(BILL_SUMMARIES[0]?.billId ?? "");
  const summary = getBillSummary(selectedBillId);

  return (
    <section
      className="border border-[#E2E8F0] rounded-[4px] p-6"
      role="region"
      aria-labelledby="simplifier-heading"
    >
      <h2
        id="simplifier-heading"
        className="font-serif text-lg font-semibold text-[#0F172A] mb-2"
      >
        Bill Simplifier
      </h2>
      <p className="text-sm text-[#64748B] mb-6">
        Plain Language: Public Interest vs Corporate Interest
      </p>

      <div className="mb-6">
        <label htmlFor="bill-select" className="block text-sm font-sans font-medium text-[#0F172A] mb-2">
          Select legislation
        </label>
        <select
          id="bill-select"
          value={selectedBillId}
          onChange={(e) => setSelectedBillId(e.target.value)}
          className="w-full px-4 py-2 text-sm border border-[#E2E8F0] rounded-[4px] bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] focus:ring-offset-0"
          aria-label="Select bill to simplify"
        >
          {BILL_SUMMARIES.map((b) => (
            <option key={b.billId} value={b.billId}>
              {b.billId}: {b.title}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <div className="space-y-6">
          <div>
            <h3 className="font-serif text-sm font-semibold text-[#0F172A] mb-2">
              Plain Language Summary
            </h3>
            <p className="text-sm text-[#0F172A] leading-relaxed">
              {summary.plainLanguage}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-[#E2E8F0] rounded-[4px] p-4 bg-[#FFFFFF]">
              <h4 className="font-serif text-sm font-semibold text-[#0F172A] mb-3">
                Public Interest
              </h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-[#0F172A]">
                {summary.publicInterestPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="border border-[#E2E8F0] rounded-[4px] p-4 bg-[#FFFFFF]">
              <h4 className="font-serif text-sm font-semibold text-[#0F172A] mb-3">
                Corporate Interest
              </h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-[#0F172A]">
                {summary.corporateInterestPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
