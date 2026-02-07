"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MemberPhoto } from "@/components/MemberPhoto";

interface MemberRow {
  id: string;
  name: string;
  riding: string;
  party: string;
  jurisdiction: string;
  chamber: string | null;
  photoUrl: string | null;
}

export function MembersDataTable({
  initialMembers,
  initialFilter = "",
}: {
  initialMembers: MemberRow[];
  initialFilter?: string;
}) {
  const [sortKey, setSortKey] = useState<keyof MemberRow>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState(initialFilter);

  const sorted = useMemo(() => {
    const list = [...initialMembers];
    list.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const c = String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [initialMembers, sortKey, sortDir]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return sorted;
    const q = filter.trim().toLowerCase();
    return sorted.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.riding.toLowerCase().includes(q) ||
        m.party.toLowerCase().includes(q) ||
        m.jurisdiction.toLowerCase().includes(q)
    );
  }, [sorted, filter]);

  const toggleSort = (key: keyof MemberRow) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden bg-white">
      <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <label htmlFor="members-filter" className="sr-only">
          Filter representatives
        </label>
        <input
          id="members-filter"
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, riding, party..."
          className="w-full max-w-sm min-h-[44px] px-3 py-2 text-base border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-0 md:min-w-[640px]">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 sm:px-6 py-3 font-serif text-sm font-semibold text-[#0F172A] w-10 sm:w-12" />
              <th className="px-4 sm:px-6 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="font-serif text-sm font-semibold text-[#0F172A] hover:underline text-left"
                >
                  Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="hidden md:table-cell px-6 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort("riding")}
                  className="font-serif text-sm font-semibold text-[#0F172A] hover:underline text-left"
                >
                  Riding {sortKey === "riding" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="hidden md:table-cell px-6 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort("party")}
                  className="font-serif text-sm font-semibold text-[#0F172A] hover:underline text-left"
                >
                  Party {sortKey === "party" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="hidden md:table-cell px-6 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort("jurisdiction")}
                  className="font-serif text-sm font-semibold text-[#0F172A] hover:underline text-left"
                >
                  Jurisdiction {sortKey === "jurisdiction" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-[#64748B] text-sm">
                  No representatives match. Try a different filter or run seed.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 sm:px-6 py-3">
                    <span className="block w-8 h-8 rounded-full overflow-hidden bg-[#F1F5F9]">
                      <MemberPhoto member={m} width={32} height={32} alt={`${m.name}`} />
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 font-sans text-sm font-medium text-[#0F172A]">
                    {m.name}
                  </td>
                  <td className="hidden md:table-cell px-6 py-3 font-sans text-sm text-[#0F172A]">{m.riding}</td>
                  <td className="hidden md:table-cell px-6 py-3 font-sans text-sm text-[#0F172A]">{m.party}</td>
                  <td className="hidden md:table-cell px-6 py-3 font-sans text-sm text-[#64748B]">{m.jurisdiction}</td>
                  <td className="px-4 sm:px-6 py-3">
                    <Link
                      href={`/mps/${encodeURIComponent(m.id)}`}
                      className="text-sm font-sans font-medium text-[#0F172A] hover:underline"
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
