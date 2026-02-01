"use client";

import type { Asset } from "@/lib/mock-data";

interface Props {
  assets: Asset[];
}

export function FinancialLedger({ assets }: Props) {
  return (
    <div
      className="border border-[#E2E8F0] rounded-[4px] overflow-hidden"
      role="region"
      aria-labelledby="ledger-heading"
    >
      <h2 id="ledger-heading" className="sr-only">
        Financial Ledger
      </h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Type
            </th>
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Description
            </th>
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Industry Tags
            </th>
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Disclosure Date
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.id}
              className="border-b border-[#E2E8F0] last:border-b-0"
            >
              <td className="px-6 py-4 text-sm text-[#0F172A]">{asset.type}</td>
              <td className="px-6 py-4 text-sm text-[#0F172A]">
                {asset.description}
              </td>
              <td className="px-6 py-4">
                <span className="flex flex-wrap gap-1">
                  {asset.industryTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-0.5 text-xs font-medium bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-[#64748B]">
                {asset.disclosureDate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
