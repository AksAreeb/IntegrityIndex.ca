"use client";

import { useJurisdiction } from "@/contexts/JurisdictionContext";

/**
 * Filters the Members directory and search results (All / Federal / Provincial).
 * Does not affect my-riding or postal-code results: those always return both
 * federal MP and provincial MPP (Ontario) when available from the API.
 */
export function JurisdictionSwitcher() {
  const { jurisdiction, setJurisdiction, primaryColor } = useJurisdiction();

  return (
    <nav
      role="navigation"
      aria-label="Jurisdiction switcher — filters Members directory and search"
      className="flex items-center gap-0.5 border-2 border-[#0F172A]/20 rounded-lg p-0.5 bg-[#F8FAFC] shadow-sm"
    >
      <JurisdictionButton
        active={jurisdiction === "ALL"}
        activeColor={jurisdiction === "ALL" ? primaryColor : "#0F172A"}
        onClick={() => setJurisdiction("ALL")}
        label="All"
      />
      <JurisdictionButton
        active={jurisdiction === "FEDERAL"}
        activeColor={jurisdiction === "FEDERAL" ? primaryColor : "#0F172A"}
        onClick={() => setJurisdiction("FEDERAL")}
        label="Federal (MPs)"
      />
      <JurisdictionButton
        active={jurisdiction === "PROVINCIAL"}
        activeColor={jurisdiction === "PROVINCIAL" ? primaryColor : "#334155"}
        onClick={() => setJurisdiction("PROVINCIAL")}
        label="Provincial (MPPs)"
      />
      <span className="sr-only" aria-live="polite">
        Current jurisdiction: {jurisdiction}. Members list and search are filtered by this selection.
      </span>
    </nav>
  );
}

function JurisdictionButton({
  active,
  activeColor,
  onClick,
  label,
}: {
  active: boolean;
  activeColor: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-current={active ? "true" : undefined}
      className={`min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-sans font-semibold transition-all rounded-md ${
        active ? "text-white shadow-sm" : "text-[#475569] hover:text-[#0F172A] hover:bg-white/80"
      }`}
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      {label}
    </button>
  );
}
