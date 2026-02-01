"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Jurisdiction } from "@/lib/mock-data";

interface JurisdictionContextValue {
  jurisdiction: Jurisdiction;
  setJurisdiction: (j: Jurisdiction) => void;
  primaryColor: string;
}

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

const COLORS = {
  FEDERAL: "#0F172A",
  PROVINCIAL: "#334155",
} as const;

export function JurisdictionProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState<Jurisdiction>("FEDERAL");

  const setJurisdiction = useCallback((j: Jurisdiction) => {
    setJurisdictionState(j);
  }, []);

  const value: JurisdictionContextValue = {
    jurisdiction,
    setJurisdiction,
    primaryColor: COLORS[jurisdiction],
  };

  return (
    <JurisdictionContext.Provider value={value}>
      {children}
    </JurisdictionContext.Provider>
  );
}

export function useJurisdiction(): JurisdictionContextValue {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) {
    throw new Error("useJurisdiction must be used within JurisdictionProvider");
  }
  return ctx;
}
