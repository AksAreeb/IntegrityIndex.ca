/**
 * Static riding metadata (name, representative placeholder, rating).
 * For postal code lookups that return both Federal MP and Provincial MLA/MPP,
 * use getRidingWalletByPostalCode in @/lib/api/geo.ts and the API
 * GET /api/geo/riding-wallet?postalCode=... which query the database for
 * both federal and provincial representatives (Prisma Member table, not separate
 * federal_ridings/provincial_ridings tables).
 */
export type OversightMode = "federal" | "provincial";

export interface RidingInfo {
  ridingId: string;
  ridingName: string;
  representative: string;
  integrityRating: number;
}

const FEDERAL_REPS: Record<string, RidingInfo> = {
  "british-columbia": {
    ridingId: "british-columbia",
    ridingName: "British Columbia",
    representative: "TBD",
    integrityRating: 72,
  },
  alberta: {
    ridingId: "alberta",
    ridingName: "Alberta",
    representative: "TBD",
    integrityRating: 68,
  },
  saskatchewan: {
    ridingId: "saskatchewan",
    ridingName: "Saskatchewan",
    representative: "TBD",
    integrityRating: 75,
  },
  manitoba: {
    ridingId: "manitoba",
    ridingName: "Manitoba",
    representative: "TBD",
    integrityRating: 71,
  },
  ontario: {
    ridingId: "ontario",
    ridingName: "Ontario",
    representative: "TBD",
    integrityRating: 69,
  },
  quebec: {
    ridingId: "quebec",
    ridingName: "Quebec",
    representative: "TBD",
    integrityRating: 74,
  },
  "new-brunswick": {
    ridingId: "new-brunswick",
    ridingName: "New Brunswick",
    representative: "TBD",
    integrityRating: 70,
  },
  "nova-scotia": {
    ridingId: "nova-scotia",
    ridingName: "Nova Scotia",
    representative: "TBD",
    integrityRating: 73,
  },
  "prince-edward-island": {
    ridingId: "prince-edward-island",
    ridingName: "Prince Edward Island",
    representative: "TBD",
    integrityRating: 78,
  },
  "newfoundland-and-labrador": {
    ridingId: "newfoundland-and-labrador",
    ridingName: "Newfoundland and Labrador",
    representative: "TBD",
    integrityRating: 72,
  },
  yukon: {
    ridingId: "yukon",
    ridingName: "Yukon",
    representative: "TBD",
    integrityRating: 80,
  },
  "northwest-territories": {
    ridingId: "northwest-territories",
    ridingName: "Northwest Territories",
    representative: "TBD",
    integrityRating: 76,
  },
  nunavut: {
    ridingId: "nunavut",
    ridingName: "Nunavut",
    representative: "TBD",
    integrityRating: 74,
  },
};

export function getRidingInfo(ridingId: string): RidingInfo {
  const id = ridingId.toLowerCase().replace(/\s+/g, "-");
  return (
    FEDERAL_REPS[id] ?? {
      ridingId: id,
      ridingName: ridingId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      representative: "TBD",
      integrityRating: Math.floor(Math.random() * 30) + 60,
    }
  );
}
