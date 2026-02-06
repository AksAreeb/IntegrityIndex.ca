"use client";

import { useJurisdiction } from "@/contexts/JurisdictionContext";

export function JurisdictionSwitcher() {
  const { jurisdiction, setJurisdiction, primaryColor } = useJurisdiction();

  return (
    <nav
      role="navigation"
      aria-label="Jurisdiction switcher"
      className="flex items-center gap-1 border border-[#E2E8F0] rounded-[4px] p-0.5 bg-[#FFFFFF]"
    >
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
        Current jurisdiction: {jurisdiction}
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
      className={`px-4 py-2 text-sm font-sans font-medium transition-colors rounded-[4px] ${
        active ? "text-white" : "text-[#0F172A] hover:bg-[#F1F5F9]"
      }`}
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      {label}
    </button>
  );
}
