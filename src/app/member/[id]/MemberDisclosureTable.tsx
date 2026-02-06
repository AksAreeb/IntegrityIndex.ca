"use client";

import { useMemo, useState } from "react";

export function MemberDisclosureTable({
  disclosures,
}: {
  disclosures: { id: number; category: string; description: string }[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return disclosures;
    return disclosures.filter(
      (d) =>
        d.category.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );
  }, [disclosures, query]);

  return (
    <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden bg-white">
      <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <label htmlFor="disclosure-search" className="sr-only">
          Search disclosures
        </label>
        <input
          id="disclosure-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by category or description..."
          className="w-full max-w-md px-3 py-2 text-sm border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-0"
        />
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Category
            </th>
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-6 py-8 text-center text-[#64748B] text-sm">
                {query ? "No disclosures match your search." : "No disclosure records."}
              </td>
            </tr>
          ) : (
            filtered.map((d) => (
              <tr
                key={d.id}
                className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]"
              >
                <td className="px-6 py-4 text-sm text-[#0F172A]">{d.category}</td>
                <td className="px-6 py-4 text-sm text-[#0F172A]">{d.description}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
