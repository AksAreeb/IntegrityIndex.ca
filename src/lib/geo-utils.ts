/**
 * GeoJSON normalization helpers for map components.
 * Maps various source formats to the structure expected by GovernanceMap.
 */

/** Normalize riding name to a stable key for map data-join (e.g. "St. John's East" -> "st-johns-east"). */
export function normalizeRidingKey(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export interface NormalizedGeoJson {
  type: string;
  features: Array<{
    type: string;
    properties?: Record<string, unknown> & {
      ridingId?: string;
      ridingName?: string;
      ENNAME?: string;
    };
    geometry?: unknown;
    rsmKey?: string;
  }>;
}

/** Normalizes GeoJSON from Code for America electoral districts or similar sources. */
export function normalizeGeoJson(data: unknown): NormalizedGeoJson {
  if (!data || typeof data !== "object") {
    return { type: "FeatureCollection", features: [] };
  }
  const d = data as { type?: string; features?: unknown[] };
  const features = Array.isArray(d.features) ? d.features : [];
  return {
    type: d.type ?? "FeatureCollection",
    features: features.map((f: unknown) => {
      const feat = f as { type?: string; properties?: Record<string, unknown>; geometry?: unknown };
      const props = feat.properties ?? {};
      const name =
        (props.name as string) ??
        (props.NAME as string) ??
        (props.enname as string) ??
        (props.ENNAME as string) ??
        "Unknown";
      const ridingId =
        (props.ridingId as string) ??
        (props.id as string) ??
        (props.FEDUID as string) ??
        normalizeRidingKey(name);
      return {
        ...feat,
        type: feat.type ?? "Feature",
        properties: {
          ...props,
          ridingId,
          ridingName: name,
          ENNAME: name,
        },
      };
    }),
  };
}
