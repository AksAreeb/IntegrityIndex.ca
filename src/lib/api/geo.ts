import axios from "axios";
import { prisma } from "@/lib/prisma";

/** OpenNorth Represent API: postcodes endpoint for postal code → boundaries */
const OPEN_NORTH_POSTCODES_BASE = "https://represent.opennorth.ca/postcodes";

export interface ResolvePostalResult {
  memberId: string;
  memberName: string;
  ridingId: string;
  ridingName: string;
}

export interface RidingByPostalResult {
  ridingId: string;
  ridingName: string;
  province: string;
  city?: string;
  /** Federal electoral district external_id from 2023 representation order when available */
  federalExternalId?: string;
}

export interface RidingWalletGeoResult {
  federal: RidingByPostalResult;
  /** Ontario provincial riding when postal code is in Ontario; null otherwise */
  provincial: {
    ridingId: string;
    ridingName: string;
  } | null;
  province: string;
  city?: string;
}

/**
 * Fetches postal code data from Open North and maps to our internal riding ID
 * for redirect to the correct MP profile. Prefers federal electoral district
 * (2023 representation order); falls back to name slug.
 */
export async function getRidingByPostalCode(
  code: string
): Promise<RidingByPostalResult | null> {
  const normalized = code.replace(/\s+/g, "").toUpperCase().slice(0, 6);
  if (normalized.length < 3) return null;

  try {
    const { data } = await axios.get<{
      code: string;
      city?: string;
      province?: string;
      boundaries_centroid?: Array<{
        name: string;
        external_id: string;
        boundary_set_name?: string;
        related?: { boundary_set_url?: string };
      }>;
    }>(`${OPEN_NORTH_POSTCODES_BASE}/${encodeURIComponent(normalized)}/`, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
        Accept: "application/json",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const boundaries = data.boundaries_centroid ?? [];
    const federal2023 = boundaries.find(
      (b) =>
        b.boundary_set_name === "Federal electoral district" &&
        b.related?.boundary_set_url?.includes("2023-representation-order")
    );
    const federalAny = boundaries.find(
      (b) => b.boundary_set_name === "Federal electoral district"
    );
    const federal = federal2023 ?? federalAny;
    if (!federal) return null;

    const ridingName = federal.name ?? "Unknown";
    const ridingId =
      federal.external_id ??
      ridingName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    return {
      ridingId,
      ridingName,
      province: data.province ?? "",
      city: data.city,
      federalExternalId: federal?.external_id,
    };
  } catch (e) {
    console.error("[geo]: getRidingByPostalCode failed", e);
    return null;
  }
}

type BoundaryItem = {
  name: string;
  external_id: string;
  boundary_set_name?: string;
  related?: { boundary_set_url?: string };
};

/**
 * Fetches postal code data and returns both Federal and Provincial (Ontario) riding info.
 * Uses a single OpenNorth API call; provincial riding only when postal is in Ontario.
 */
export async function getRidingWalletByPostalCode(
  code: string
): Promise<RidingWalletGeoResult | null> {
  const normalized = code.replace(/\s+/g, "").toUpperCase().slice(0, 6);
  if (normalized.length < 3) return null;

  try {
    const { data } = await axios.get<{
      code: string;
      city?: string;
      province?: string;
      boundaries_centroid?: BoundaryItem[];
    }>(`${OPEN_NORTH_POSTCODES_BASE}/${encodeURIComponent(normalized)}/`, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
        Accept: "application/json",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const boundaries = data.boundaries_centroid ?? [];
    const province = data.province ?? "";

    const federal2023 = boundaries.find(
      (b) =>
        b.boundary_set_name === "Federal electoral district" &&
        b.related?.boundary_set_url?.includes("2023-representation-order")
    );
    const federalAny = boundaries.find(
      (b) => b.boundary_set_name === "Federal electoral district"
    );
    const federalB = federal2023 ?? federalAny;
    if (!federalB) return null;

    const federalRidingName = federalB.name ?? "Unknown";
    const federalRidingId =
      federalB.external_id ??
      federalRidingName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    let provincial: { ridingId: string; ridingName: string } | null = null;
    if (province === "ON") {
      const ontarioB = boundaries.find((b) => {
        const set = (b.boundary_set_name ?? "").toLowerCase();
        const name = (b.name ?? "").toLowerCase();
        if (set.includes("federal")) return false;
        const looksOntario =
          /ontario|provincial/.test(set) || /ontario|electoral district/.test(name);
        const looksRiding =
          /electoral|riding|provincial|district|mpp|boundary/.test(set) ||
          /riding|electoral|district/.test(name);
        return looksOntario && looksRiding;
      });
      if (ontarioB) {
        const pName = ontarioB.name ?? "Unknown";
        provincial = {
          ridingId:
            ontarioB.external_id ??
            pName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          ridingName: pName,
        };
      }
    }

    return {
      federal: {
        ridingId: federalRidingId,
        ridingName: federalRidingName,
        province,
        city: data.city,
        federalExternalId: federalB.external_id,
      },
      provincial,
      province,
      city: data.city,
    };
  } catch (e) {
    console.error("[geo]: getRidingWalletByPostalCode failed", e);
    return null;
  }
}

/**
 * Maps a postal code to Member IDs in the database using the OpenNorth API
 * (represent.opennorth.ca/postcodes/). Returns federal and, when available,
 * provincial representative IDs for the given postal code.
 */
export async function getMemberIdsByPostalCode(code: string): Promise<{
  federalMemberId: string | null;
  provincialMemberId: string | null;
} | null> {
  const result = await resolvePostalCode(code);
  if (!result) return null;
  const provincial = await prisma.member.findFirst({
    where: {
      jurisdiction: "PROVINCIAL",
      OR: [
        { riding: result.ridingName },
        { id: result.ridingId },
      ],
    },
    select: { id: true },
  });
  return {
    federalMemberId: result.memberId,
    provincialMemberId: provincial?.id ?? null,
  };
}

/**
 * Fetches from https://represent.opennorth.ca/postcodes/${code}/,
 * extracts the Federal Electoral District name, and finds the corresponding MP in Prisma.
 * Returns the Member's id and name for redirect to MP profile.
 */
export async function resolvePostalCode(
  code: string
): Promise<ResolvePostalResult | null> {
  const normalized = code.replace(/\s+/g, "").toUpperCase().slice(0, 6);
  if (normalized.length < 3) return null;

  const riding = await getRidingByPostalCode(normalized);
  if (!riding) return null;

  const ridingId = riding.ridingId;
  const ridingName = riding.ridingName; // Federal Electoral District name

  const slug = ridingName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const member = await prisma.member.findFirst({
    where: {
      OR: [{ id: ridingId }, { id: slug }, { riding: ridingName }],
    },
    select: { id: true, name: true, riding: true },
  });

  if (!member) return null;

  return {
    memberId: member.id,
    memberName: member.name,
    ridingId: member.id,
    ridingName: member.riding,
  };
}
