/**
 * Centralized constants for IntegrityIndex.ca.
 * Use NEXT_PUBLIC_* for values needed in the browser.
 */

/** Primary GeoJSON source for federal electoral districts (map boundaries). */
export const FEDERAL_URL_PRIMARY =
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada-electoral-districts.geojson";

/** Fallback GeoJSON source when primary returns empty features. */
export const FEDERAL_URL_FALLBACK = FEDERAL_URL_PRIMARY;

/** GeoJSON source for Ontario provincial ridings (local API route). */
export const PROVINCIAL_URL_PRIMARY = "/api/geojson/ontario";

/** Alias for Ontario map data. */
export const ONTARIO_GEOJSON_URL = PROVINCIAL_URL_PRIMARY;
