"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as topojson from "topojson-client";
import { MapSkeleton } from "./MapSkeleton";
import { getRidingInfo } from "@/lib/riding-data";
import type { OversightMode } from "@/lib/riding-data";
import { normalizeGeoJson, normalizeRidingKey } from "@/lib/geo-utils";

/** 343-seat 2023 Representation Order: TopoJSON prioritized; join choropleth by FED_ID. */
const TOPOJSON_FEDERAL_PATH = "/data/canada_ridings_2023.topojson";
/** Same topology if served as .json (e.g. canada_ridings_2023.json). */
const TOPOJSON_FEDERAL_PATH_ALT = "/data/canada_ridings_2023.json";
/** Fallback GeoJSON (e.g. placeholder). */
const GEOJSON_FEDERAL_PATH = "/data/canada_ridings.json";
const GEOJSON_ONTARIO = "/api/geojson/ontario";

/** Choropleth: more Material Changes = darker. Scale from no activity (light) to max (intense). */
const CHOROPLETH_BASE = "#1E3A8A"; // slate-900 / blue-900
const CHOROPLETH_LIGHT = "#E2E8F0"; // no activity
const DEFAULT_FILL = "#E2E8F0";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}
function interpolateColor(hexFrom: string, hexTo: string, t: number): string {
  const a = hexToRgb(hexFrom);
  const b = hexToRgb(hexTo);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

/** Party colors for tooltip/labels (choropleth is by activity). */
const PARTY_FILL: Record<string, string> = {
  Liberal: "#B91C1C",
  Conservative: "#1E3A8A",
  NDP: "#EA580C",
  "Bloc Québécois": "#0284C7",
  Bloc: "#0284C7",
  Green: "#15803D",
};

interface GovernanceMapProps {
  mode: OversightMode;
}

type MemberInfo = {
  id: string;
  name: string;
  photoUrl: string | null;
  party: string;
};

type EnrichedProperties = {
  ridingId?: string;
  ridingName?: string;
  ENNAME?: string;
  name?: string;
  /** Elections Canada / Open Canada property names. */
  ED_NAMEE?: string;
  CF_NOMAN?: string;
  /** Federal electoral district ID for data-join with riding-activity (FED_ID or NUM_CF). */
  FED_ID?: string;
  _member?: MemberInfo;
  /** Joined from /api/riding-activity by FED_ID for choropleth. */
  _materialChangeCount?: number;
};

type GeoFeature = {
  properties?: EnrichedProperties;
  geometry?: unknown;
  rsmKey?: string;
  type?: string;
};

const MemoizedGeography = memo(function MemoizedGeography({
  geo,
  fill,
  isHovered,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onClick,
}: {
  geo: GeoFeature;
  fill: string;
  isHovered: boolean;
  onMouseEnter: (e: React.MouseEvent<SVGPathElement>, g: GeoFeature) => void;
  onMouseMove: (e: React.MouseEvent<SVGPathElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent, g: GeoFeature) => void;
}) {
  return (
    <Geography
      geography={geo}
      fill={fill}
      stroke={isHovered ? "#0f172a" : "#94a3b8"}
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
    memberName: string;
    memberPhotoUrl: string | null;
    party: string;
    ridingId: string;
    materialChangeCount?: number;
  } | null>(null);
  /** Max trade count across ridings for choropleth scale. */
  const [activityMax, setActivityMax] = useState(0);
  const [geoData, setGeoData] = useState<{
    type: string;
    features: GeoFeature[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickLoading, setClickLoading] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined";
    setMounted(ok);
    if (process.env.NODE_ENV === "development") {
      console.log("[GovernanceMap] mounted:", ok, "window defined:", ok);
    }
  }, []);

  const isFederal = mode === "federal";

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (isFederal) {
          const [topoRes, topoAltRes, geoFallbackRes, membersRes, activityRes] = await Promise.all([
            fetch(TOPOJSON_FEDERAL_PATH),
            fetch(TOPOJSON_FEDERAL_PATH_ALT),
            fetch(GEOJSON_FEDERAL_PATH),
            fetch("/api/members"),
            fetch("/api/riding-activity"),
          ]);

          let geoJson: { type: string; features: GeoFeature[] };
          const topoBody = topoRes.ok ? await topoRes.json() : topoAltRes.ok ? await topoAltRes.json() : null;
          const isTopology = topoBody?.type === "Topology" && topoBody?.objects;

          if (isTopology) {
            const topo = topoBody as { type: string; objects: Record<string, unknown> };
            const objKey = Object.keys(topo.objects).find((k) => k !== "default") ?? Object.keys(topo.objects)[0];
            if (objKey) {
              geoJson = topojson.feature(topo as Parameters<typeof topojson.feature>[0], topo.objects[objKey] as Parameters<typeof topojson.feature>[1]) as { type: string; features: GeoFeature[] };
            } else {
              geoJson = { type: "FeatureCollection", features: [] };
            }
          } else if (geoFallbackRes.ok) {
            geoJson = await geoFallbackRes.json();
          } else {
            console.error("[GovernanceMap] GeoJSON/TopoJSON fetch failed:", topoRes.status, geoFallbackRes.status);
            const apiFallback = await fetch("/api/geojson/federal").catch(() => null);
            if (apiFallback?.ok) {
              geoJson = await apiFallback.json();
              console.log("[GovernanceMap] Using /api/geojson/federal fallback (province-level)");
            } else {
              setError(`Failed to load map (${geoFallbackRes.status})`);
              setLoading(false);
              return;
            }
          }

          const membersData = await membersRes.json().catch(() => ({ members: [] }));
          const members: Array<{ id: string; name: string; riding: string; party: string; photoUrl: string | null; jurisdiction: string }> =
            membersData.members ?? [];
          const federalMembers = members.filter(
            (m) => (m.jurisdiction || "").toUpperCase() === "FEDERAL"
          );
          const membersByRiding: Record<string, (typeof federalMembers)[number]> = {};
          for (const m of federalMembers) {
            const key = normalizeRidingKey(m.riding);
            if (key) membersByRiding[key] = m;
          }

          const activityData = await activityRes.json().catch(() => ({ items: [] }));
          const activityItems: Array<{ ridingKey: string; ridingName: string; party: string | null; tradeCount: number }> = activityData.items ?? [];

          const features = Array.isArray(geoJson.features) ? geoJson.features : [];

          /** FED_ID from TopoJSON/GeoJSON (FED_ID, NUM_CF, or FED_NUM) for data-join. */
          const getFedId = (props: Record<string, unknown>): string => {
            const id = props.FED_ID ?? props.NUM_CF ?? props.FED_NUM;
            return id != null ? String(id) : "";
          };

          /** Build ridingKey -> FED_ID from geo so we can key activity by FED_ID. */
          const ridingKeyToFedId: Record<string, string> = {};
          for (const f of features) {
            const props = f.properties ?? {};
            const ridingName =
              (props.name as string) ??
              (props.ridingName as string) ??
              (props.ENNAME as string) ??
              (props.ED_NAMEE as string) ??
              (props.CF_NOMAN as string) ??
              "";
            const ridingKey = normalizeRidingKey(ridingName);
            const fedId = getFedId(props);
            if (ridingKey && fedId) ridingKeyToFedId[ridingKey] = fedId;
          }

          /** Activity keyed by FED_ID for choropleth join in geographies.map. */
          const activityByFedId: Record<string, { tradeCount: number; party: string | null }> = {};
          let maxCount = 0;
          for (const a of activityItems) {
            const fedId = ridingKeyToFedId[a.ridingKey];
            if (fedId) {
              activityByFedId[fedId] = { tradeCount: a.tradeCount, party: a.party };
              if (a.tradeCount > maxCount) maxCount = a.tradeCount;
            }
          }
          setActivityMax(maxCount);

          const enrichedFeatures: GeoFeature[] = features.map((f: GeoFeature) => {
            const props = f.properties ?? {};
            const ridingName =
              (props.name as string) ??
              (props.ridingName as string) ??
              (props.ENNAME as string) ??
              (props.ED_NAMEE as string) ??
              (props.CF_NOMAN as string) ??
              "";
            const fedId = getFedId(props);
            const ridingKey = (props.ridingId as string) ?? normalizeRidingKey(ridingName);
            const member = membersByRiding[ridingKey];
            const activity = fedId ? activityByFedId[fedId] : undefined;
            const _member: MemberInfo | undefined = member
              ? {
                  id: member.id,
                  name: member.name,
                  photoUrl: member.photoUrl ?? null,
                  party: member.party ?? "",
                }
              : undefined;
            return {
              ...f,
              properties: {
                ...props,
                ridingId: ridingKey,
                ridingName: ridingName || (props.ridingName as string),
                ENNAME: ridingName || (props.ENNAME as string),
                name: ridingName || (props.name as string),
                FED_ID: fedId || undefined,
                _member,
                _materialChangeCount: activity?.tradeCount ?? 0,
              },
            };
          });

          console.log("[GovernanceMap] Federal geographies loaded:", enrichedFeatures.length, "features");
          setGeoData({
            type: geoJson.type ?? "FeatureCollection",
            features: enrichedFeatures,
          });
        } else {
          const res = await fetch(GEOJSON_ONTARIO);
          if (!res.ok) {
            setError(`Failed to load map (${res.status})`);
            setLoading(false);
            return;
          }
          const data = await res.json();
          const normalized = normalizeGeoJson(data);
          const features = normalized.features as GeoFeature[];
          console.log("[GovernanceMap] Ontario geographies loaded:", features.length, "features");
          setGeoData({
            type: normalized.type,
            features,
          });
        }
        setLoading(false);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        console.error("[GovernanceMap] Load error:", e.message);
        setError("Failed to load map");
        setLoading(false);
      }
    };

    load();
  }, [mounted, isFederal]);

  /** Choropleth: more Material Changes (TradeTicker) = darker shade. */
  const getFill = useCallback(
    (geo: GeoFeature) => {
      if (!isFederal) return "#F1F5F9";
      const count = geo.properties?._materialChangeCount ?? 0;
      if (count <= 0 || activityMax <= 0) return CHOROPLETH_LIGHT;
      const t = Math.min(1, count / activityMax);
      return interpolateColor(CHOROPLETH_LIGHT, CHOROPLETH_BASE, t);
    },
    [isFederal, activityMax]
  );

  const handleMouseEnter = useCallback(
    (evt: React.MouseEvent<SVGPathElement>, geo: GeoFeature) => {
      const rid = geo.properties?.ridingId ?? geo.properties?.ridingName ?? "unknown";
      if (isFederal && geo.properties?._member) {
        const m = geo.properties._member;
        const materialChangeCount = geo.properties?._materialChangeCount ?? 0;
        setHoveredId(rid);
        setTooltip({
          x: evt.clientX,
          y: evt.clientY,
          ridingName: (geo.properties?.ridingName as string) ?? (geo.properties?.name as string) ?? "",
          memberName: m.name,
          memberPhotoUrl: m.photoUrl,
          party: m.party,
          ridingId: rid,
          materialChangeCount: materialChangeCount > 0 ? materialChangeCount : undefined,
        });
      } else {
        const info = getRidingInfo(rid);
        setHoveredId(rid);
        setTooltip({
          x: evt.clientX,
          y: evt.clientY,
          ridingName: info.ridingName,
          memberName: info.representative,
          memberPhotoUrl: null,
          party: "",
          ridingId: rid,
        });
      }
    },
    [isFederal]
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
    (evt: React.MouseEvent, geo: GeoFeature) => {
      evt.preventDefault();
      const ridingName =
        (geo.properties?.name as string) ??
        (geo.properties?.ridingName as string) ??
        (geo.properties?.ENNAME as string) ??
        "";
      const member = geo.properties?._member;
      if (isFederal && member) {
        setClickLoading(true);
        router.push(`/mps/${encodeURIComponent(member.id)}`);
        setClickLoading(false);
      } else {
        setClickLoading(true);
        router.push(`/mps?q=${encodeURIComponent(ridingName || "unknown")}`);
        setClickLoading(false);
      }
    },
    [router, isFederal]
  );

  if (typeof window === "undefined" || !mounted) {
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
          <p className="font-sans text-sm font-medium text-[#0F172A]">Loading profile…</p>
        </div>
      )}
      <ComposableMap
        projection={isFederal ? "geoConicConformal" : "geoMercator"}
        projectionConfig={projectionConfig}
        className="w-full h-full rounded-[4px]"
        style={{ backgroundColor: "#F1F5F9" }}
      >
        {geoData ? (
          <Geographies geography={geoData}>
            {({ geographies }) => {
              if (process.env.NODE_ENV === "development" && geographies?.length === 0) {
                console.warn("[GovernanceMap] Geographies empty - map container may have 0px height");
              }
              return (geographies as GeoFeature[]).map((geo) => {
                const rid = geo.properties?.ridingId ?? geo.properties?.ridingName ?? "unknown";
                return (
                  <MemoizedGeography
                    key={geo.rsmKey ?? rid}
                    geo={geo}
                    fill={getFill(geo)}
                    isHovered={hoveredId === rid}
                    onMouseEnter={handleMouseEnter}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                  />
                );
              });
            }}
          </Geographies>
        ) : (
          <MapSkeleton />
        )}
      </ComposableMap>
      {tooltip && typeof window !== "undefined" && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-[#0f172a]/10 shadow-lg px-4 py-3 rounded-[4px] max-w-[260px]"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 280),
            top: tooltip.y + 12,
          }}
        >
          <div className="flex items-start gap-3">
            {tooltip.memberPhotoUrl ? (
              <span className="relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-[#F1F5F9]">
                <Image
                  src={tooltip.memberPhotoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="font-serif font-semibold text-[#0f172a] text-sm mb-0.5">
                {tooltip.memberName || tooltip.ridingName}
              </p>
              <p className="text-xs text-[#64748B] font-sans">
                {tooltip.ridingName}
                {tooltip.party ? ` · ${tooltip.party}` : ""}
                {tooltip.materialChangeCount != null && tooltip.materialChangeCount > 0 ? (
                  <span className="block mt-1 text-[#0f172a] font-medium">
                    {tooltip.materialChangeCount} Material Change{tooltip.materialChangeCount !== 1 ? "s" : ""}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const GovernanceMap = memo(GovernanceMapInner);
