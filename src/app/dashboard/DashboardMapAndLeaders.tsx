"use client";

import { useState } from "react";
import Link from "next/link";
import { GovernanceMapDynamic } from "@/components/GovernanceMapDynamic";
import type { OversightMode } from "@/lib/riding-data";

type LeaderRow = { id: string; name: string; riding: string; score: number };

export function DashboardMapAndLeaders({
  leaders,
  vested,
}: {
  leaders: LeaderRow[];
  vested: LeaderRow[];
}) {
  const [mode, setMode] = useState<OversightMode>("federal");

  return (
    <>
      <div
        className="mb-6 flex gap-2 border-b border-[#0f172a]/10 pb-4"
        role="tablist"
        aria-label="Oversight mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "federal"}
          aria-controls="map-panel"
          onClick={() => setMode("federal")}
          className={`px-5 py-2.5 text-sm font-sans font-medium rounded-[4px] transition-colors ${
            mode === "federal"
              ? "bg-[#0f172a] text-white"
              : "bg-[#F1F5F9] text-[#0f172a] hover:bg-[#e2e8f0]"
          }`}
        >
          Federal Oversight
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "provincial"}
          aria-controls="map-panel"
          onClick={() => setMode("provincial")}
          className={`px-5 py-2.5 text-sm font-sans font-medium rounded-[4px] transition-colors ${
            mode === "provincial"
              ? "bg-[#0f172a] text-white"
              : "bg-[#F1F5F9] text-[#0f172a] hover:bg-[#e2e8f0]"
          }`}
        >
          Provincial (Ontario) Oversight
        </button>
      </div>

      <section
        id="map-panel"
        role="tabpanel"
        className="mb-10 border border-[#0f172a]/10 rounded-[4px] overflow-hidden bg-[#FFFFFF]"
      >
        <GovernanceMapDynamic mode={mode} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section
          className="border border-[#0f172a]/10 rounded-[4px] overflow-hidden bg-[#FFFFFF]"
          aria-labelledby="leaders-heading"
        >
          <h2
            id="leaders-heading"
            className="font-serif text-lg font-semibold text-[#0f172a] px-6 py-4 border-b border-[#0f172a]/10"
          >
            Governance Leaders
          </h2>
          <ul className="divide-y divide-[#0f172a]/10">
            {leaders.length === 0 ? (
              <li className="px-6 py-4 text-sm text-[#64748B]">No member data yet. Run seed to populate.</li>
            ) : (
              leaders.map((item) => (
                <li key={item.id} className="px-6 py-4 flex justify-between items-center">
                  <Link href={`/mps/${encodeURIComponent(item.id)}`} className="min-w-0 flex-1">
                    <p className="font-sans font-medium text-[#0f172a]">{item.name}</p>
                    <p className="text-sm font-sans text-[#64748B]">{item.riding}</p>
                  </Link>
                  <span className="text-sm font-sans font-semibold text-[#0f172a] ml-4">
                    {item.score}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section
          className="border border-[#0f172a]/10 rounded-[4px] overflow-hidden bg-[#FFFFFF]"
          aria-labelledby="vested-heading"
        >
          <h2
            id="vested-heading"
            className="font-serif text-lg font-semibold text-[#0f172a] px-6 py-4 border-b border-[#0f172a]/10"
          >
            Vested Interest Profiles
          </h2>
          <ul className="divide-y divide-[#0f172a]/10">
            {vested.length === 0 ? (
              <li className="px-6 py-4 text-sm text-[#64748B]">No member data yet. Run seed to populate.</li>
            ) : (
              vested.map((item) => (
                <li key={item.id} className="px-6 py-4 flex justify-between items-center">
                  <Link href={`/mps/${encodeURIComponent(item.id)}`} className="min-w-0 flex-1">
                    <p className="font-sans font-medium text-[#0f172a]">{item.name}</p>
                    <p className="text-sm font-sans text-[#64748B]">{item.riding}</p>
                  </Link>
                  <span className="text-sm font-sans font-semibold text-[#0f172a] ml-4">
                    {item.score}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
