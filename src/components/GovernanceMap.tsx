"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useRouter } from "next/navigation";
import { MapSkeleton } from "./MapSkeleton";
import { getRidingInfo } from "@/lib/riding-data";
import type { OversightMode } from "@/lib/riding-data";

const FEDERAL_URL =
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada-electoral-districts.geojson";
const ONTARIO_URL = "/api/geojson/ontario";

interface GovernanceMapProps {
  mode: OversightMode;
}

type GeoFeature = {
  properties?: { ridingId?: string; ridingName?: string; ENNAME?: string };
  rsmKey?: string;
};

const MemoizedGeography = memo(function MemoizedGeography({
  geo,
  isHovered,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onClick,
}: {
  geo: GeoFeature;
  isHovered: boolean;
  onMouseEnter: (e: React.MouseEvent<SVGPathElement>, g: GeoFeature) => void;
  onMouseMove: (e: React.MouseEvent<SVGPathElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent, g: GeoFeature) => void;
}) {
  return (
    <Geography
      geography={geo}
      fill={isHovered ? "#E2E8F0" : "#F1F5F9"}
      stroke={isHovered ? "#0f172a" : "#cbd5e1"}
      strokeWidth={isHovered ? 2 : 0.5}
      className="transition-[fill,stroke] duration-150 ease-out"
      style={{
        default: { outline: "none", cursor: "pointer" },
        hover: { outline: "none", cursor: "pointer" },
        pressed: { outline: "none", cursor: "pointer" },
      }}
      onMouseEnter={(e) => onMouseEnter(e, geo)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={(e) => onClick(e, geo)}
    />
  );
});

function GovernanceMapInner({ mode }: GovernanceMapProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    ridingName: string;
    representative: string;
    integrityRating: number;
    ridingId: string;
  } | null>(null);
  const [geoData, setGeoData] = useState<{
    type: string;
    features: Array<{
      type: string;
      properties?: Record<string, unknown>;
      geometry?: unknown;
      rsmKey?: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickLoading, setClickLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isFederal = mode === "federal";

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    setError(null);
    const url = isFederal ? FEDERAL_URL_PRIMARY : ONTARIO_URL;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const normalized = isFederal ? normalizeGeoJson(data) : data;
        if (!normalized.features?.length && isFederal) {
          return fetch(FEDERAL_URL_FALLBACK)
            .then((r2) => (r2.ok ? r2.json() : Promise.reject(new Error("Fallback failed"))))
            .then((fallback) => normalizeGeoJson(fallback));
        }
        return normalized;
      })
      .then(setGeoData)
      .catch(() => setError("Failed to load map"))
      .finally(() => setLoading(false));
  }, [mounted, isFederal]);

  const handleMouseEnter = useCallback(
    (evt: React.MouseEvent<SVGPathElement>, geo: GeoFeature) => {
      const rid = geo.properties?.ridingId ?? "unknown";
      const info = getRidingInfo(rid);
      setHoveredId(rid);
      setTooltip({
        x: evt.clientX,
        y: evt.clientY,
        ridingName: info.ridingName,
        representative: info.representative,
        integrityRating: info.integrityRating,
        ridingId: rid,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      setTooltip((t) => (t ? { ...t, x: evt.clientX, y: evt.clientY } : null));
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback(
    (_evt: React.MouseEvent, geo: GeoFeature) => {
      const enname =
        (geo.properties?.ENNAME as string) ??
        (geo.properties?.ridingName as string) ??
        geo.properties?.ridingId ??
        "unknown";
      setClickLoading(true);
      router.push(`/mps/${encodeURIComponent(String(enname))}`);
      setClickLoading(false);
    },
    [router]
  );

  if (!mounted) {
    return null;
  }

  if (loading) return <MapSkeleton />;
  if (error || !geoData) {
    return (
      <div className="w-full aspect-[16/10] min-h-[400px] bg-[#F1F5F9] flex items-center justify-center rounded-[4px]">
        <p className="text-[#64748B]">{error ?? "No data"}</p>
      </div>
    );
  }

  // Lambert Conformal Conic for Canada: standard parallels 49°N and 77°N, central meridian ~96°W
  const projectionConfig = isFederal
    ? {
        scale: 600,
        center: [-96, 62] as [number, number],
        parallels: [49, 77] as [number, number],
        rotate: [-96, 0, 0] as [number, number, number],
      }
    : { scale: 2500, center: [-79.4, 43.7] as [number, number] };

  return (
    <div className="relative w-full h-full min-h-0 rounded-[4px]">
      {clickLoading && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#F1F5F9]/80 rounded-[4px]"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="font-sans text-sm font-medium text-[#0F172A]">
            Loading profile…
          </p>
        </div>
      )}
      <ComposableMap
        projection={isFederal ? "geoConicConformal" : "geoMercator"}
        projectionConfig={projectionConfig}
        className="w-full h-full rounded-[4px]"
        style={{ backgroundColor: "#F1F5F9" }}
      >
        <Geographies geography={geoData}>
          {({ geographies }) =>
            (geographies as GeoFeature[]).map((geo) => (
              <MemoizedGeography
                key={geo.rsmKey}
                geo={geo}
                isHovered={hoveredId === (geo.properties?.ridingId ?? "unknown")}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
      {tooltip && typeof window !== "undefined" && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-[#0f172a]/10 shadow-lg px-4 py-3 rounded-[4px] max-w-[240px]"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 260),
            top: tooltip.y + 12,
          }}
        >
          <p className="font-serif font-semibold text-[#0f172a] text-sm mb-1">
            {tooltip.ridingName}
          </p>
          <p className="text-xs text-[#64748B] font-sans mb-1">
            {tooltip.representative}
          </p>
          <p className="text-xs text-[#0f172a] font-sans font-medium">
            Integrity Rating: {tooltip.integrityRating}/100
          </p>
        </div>
      )}
    </div>
  );
}

export const GovernanceMap = memo(GovernanceMapInner);
