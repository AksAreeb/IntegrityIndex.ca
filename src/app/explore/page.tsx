"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GovernanceMapDynamic } from "@/components/GovernanceMapDynamic";
import type { OversightMode } from "@/lib/riding-data";

export default function ExplorePage() {
  const [mode, setMode] = useState<OversightMode>("federal");

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Integrity Map
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-6">
          Geospatial view of parliamentary accountability across Canada
        </p>

        <div
          className="mb-6 flex gap-2 border-b border-[#E2E8F0] pb-4"
          role="tablist"
          aria-label="Map mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "federal"}
            aria-controls="map-panel"
            onClick={() => setMode("federal")}
            className={`px-5 py-2.5 text-sm font-sans font-medium rounded-[4px] transition-colors ${
              mode === "federal"
                ? "bg-[#0F172A] text-white"
                : "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]"
            }`}
          >
            Federal View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "provincial"}
            aria-controls="map-panel"
            onClick={() => setMode("provincial")}
            className={`px-5 py-2.5 text-sm font-sans font-medium rounded-[4px] transition-colors ${
              mode === "provincial"
                ? "bg-[#0F172A] text-white"
                : "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]"
            }`}
          >
            Provincial (Ontario)
          </button>
        </div>

        <section
          id="map-panel"
          role="tabpanel"
          className="border border-[#E2E8F0] rounded-[4px] overflow-hidden bg-[#FFFFFF]"
        >
          <GovernanceMapDynamic mode={mode} />
        </section>
      </div>
    </AppShell>
  );
}
