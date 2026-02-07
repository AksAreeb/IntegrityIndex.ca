"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Jurisdiction } from "@/types";

const STORAGE_KEY = "integrity-jurisdiction";

interface JurisdictionContextValue {
  jurisdiction: Jurisdiction;
  setJurisdiction: (j: Jurisdiction) => void;
  primaryColor: string;
}

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

/** Strict design tokens: Federal Deep Navy, Provincial Slate. Used by Recharts and UI. */
const COLORS = {
  FEDERAL: "#0F172A",
  PROVINCIAL: "#334155",
  ALL: "#0F172A",
} as const;

function readStored(): Jurisdiction {
  if (typeof window === "undefined") return "ALL";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "FEDERAL" || raw === "PROVINCIAL" || raw === "ALL") return raw;
  return "ALL";
}

export function JurisdictionProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState<Jurisdiction>("ALL");

  useEffect(() => {
    setJurisdictionState(readStored());
  }, []);

  const setJurisdiction = useCallback((j: Jurisdiction) => {
    setJurisdictionState(j);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, j);
    }
  }, []);

  const primaryColor = COLORS[jurisdiction] ?? COLORS.ALL;

  const value: JurisdictionContextValue = {
    jurisdiction,
    setJurisdiction,
    primaryColor,
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
