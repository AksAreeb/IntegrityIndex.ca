"use client";

import { useJurisdiction } from "@/contexts/JurisdictionContext";

export function JurisdictionSwitcher() {
  const { jurisdiction, setJurisdiction, primaryColor } = useJurisdiction();

  return (
    <nav
      role="navigation"
      aria-label="Jurisdiction switcher — filters Members directory and search"
      className="flex items-center gap-0.5 border-2 border-[#0F172A]/20 rounded-lg p-0.5 bg-[#F8FAFC] shadow-sm"
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
      className={`px-3 py-2 text-sm font-sans font-semibold transition-all rounded-md ${
        active ? "text-white shadow-sm" : "text-[#475569] hover:text-[#0F172A] hover:bg-white/80"
      }`}
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      {label}
    </button>
  );
}
