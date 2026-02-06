"use client";

/**
 * Interactive riding map. Uses react-simple-maps and GeoJSON/TopoJSON.
 * Click a riding → navigate to /riding/[ENNAME].
 * Federal data: current GeoJSON (provinces); can be switched to 2024 FED TopoJSON when available.
 */
import { GovernanceMapDynamic } from "./GovernanceMapDynamic";
import type { OversightMode } from "@/lib/riding-data";

interface MapComponentProps {
  mode: OversightMode;
}

export function MapComponent({ mode }: MapComponentProps) {
  return <GovernanceMapDynamic mode={mode} />;
}
