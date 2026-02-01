"use client";

import React, { memo, useCallback, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useRouter } from "next/navigation";
import { MapSkeleton } from "./MapSkeleton";
import { getRidingInfo } from "@/lib/riding-data";
import type { OversightMode } from "@/lib/riding-data";

const FEDERAL_URL = "/api/geojson/federal";
const ONTARIO_URL = "/api/geojson/ontario";

interface GovernanceMapProps {
  mode: OversightMode;
}

function GovernanceMapInner({ mode }: GovernanceMapProps) {
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

  const url = mode === "federal" ? FEDERAL_URL : ONTARIO_URL;

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGeoData(data);
      })
      .catch(() => setError("Failed to load map"))
      .finally(() => setLoading(false));
  }, [url]);

  const handleMouseEnter = useCallback(
    (evt: React.MouseEvent<SVGPathElement>, geo: { properties?: { ridingId?: string; ridingName?: string }; rsmKey?: string }) => {
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
      if (tooltip)
        setTooltip((t) => (t ? { ...t, x: evt.clientX, y: evt.clientY } : null));
    },
    [tooltip]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback(
    (_evt: React.MouseEvent, geo: { properties?: { ridingId?: string }; rsmKey?: string }) => {
      const rid = geo.properties?.ridingId ?? "unknown";
      router.push(`/mps/${rid}`);
    },
    [router]
  );

  if (loading) return <MapSkeleton />;
  if (error || !geoData) {
    return (
      <div className="w-full min-h-[400px] bg-[#F1F5F9] flex items-center justify-center rounded-[4px]">
        <p className="text-[#64748B]">{error ?? "No data"}</p>
      </div>
    );
  }

  const isFederal = mode === "federal";
  const projectionConfig = isFederal
    ? { scale: 400, center: [-96, 62] as [number, number] }
    : { scale: 2500, center: [-79.4, 43.7] as [number, number] };

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={projectionConfig}
        className="w-full h-full min-h-[400px] rounded-[4px]"
        style={{ backgroundColor: "#F1F5F9" }}
      >
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo: { properties?: { ridingId?: string }; rsmKey?: string }) => {
              const rid = geo.properties?.ridingId ?? "unknown";
              const isHovered = hoveredId === rid;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#F1F5F9"
                  stroke={isHovered ? "#0f172a" : "#cbd5e1"}
                  strokeWidth={isHovered ? 2 : 0.5}
                  style={{
                    default: { outline: "none", cursor: "pointer" },
                    hover: { outline: "none", cursor: "pointer" },
                    pressed: { outline: "none", cursor: "pointer" },
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, geo)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => handleClick(e, geo)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip && (
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
