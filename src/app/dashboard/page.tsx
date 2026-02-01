"use client";

import { useState } from "react";
import Link from "next/link";
import { GovernanceMapDynamic } from "@/components/GovernanceMapDynamic";
import { AppShell } from "@/components/AppShell";
import type { OversightMode } from "@/lib/riding-data";

const PLACEHOLDER_LEADERS = [
  { name: "Member A", riding: "Riding A", score: 94 },
  { name: "Member B", riding: "Riding B", score: 91 },
  { name: "Member C", riding: "Riding C", score: 89 },
];

const PLACEHOLDER_VESTED = [
  { name: "Member X", riding: "Riding X", score: 34 },
  { name: "Member Y", riding: "Riding Y", score: 41 },
  { name: "Member Z", riding: "Riding Z", score: 48 },
];

export default function DashboardPage() {
  const [mode, setMode] = useState<OversightMode>("federal");

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Interactive Governance Map
        </h1>
        <Link
          href="/lab"
          className="text-sm font-sans font-medium text-[#0F172A] hover:text-[#334155]"
        >
          Transparency Lab
        </Link>
        </div>

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
              {PLACEHOLDER_LEADERS.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  className="px-6 py-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-sans font-medium text-[#0f172a]">{item.name}</p>
                    <p className="text-sm font-sans text-[#64748B]">{item.riding}</p>
                  </div>
                  <span className="text-sm font-sans font-semibold text-[#0f172a]">
                    {item.score}
                  </span>
                </li>
              ))}
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
              {PLACEHOLDER_VESTED.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  className="px-6 py-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-sans font-medium text-[#0f172a]">{item.name}</p>
                    <p className="text-sm font-sans text-[#64748B]">{item.riding}</p>
                  </div>
                  <span className="text-sm font-sans font-semibold text-[#0f172a]">
                    {item.score}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
