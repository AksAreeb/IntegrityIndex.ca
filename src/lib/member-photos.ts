import {
  getMemberPhotoUrl as getFederalPhotoUrl,
  getMemberPhotoUrl44,
} from "@/lib/scrapers/ciecScraper";

const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/styles/mpp_profile/public/mpp-photos";

export interface MemberForPhoto {
  id: string;
  jurisdiction: string;
  photoUrl?: string | null;
}

/**
 * Returns the primary photo URL for a member.
 * Federal: 45th Parliament URL (caller should use 44th on 404).
 * Provincial (MPP): OLA image CDN using member id as slug.
 */
export function getMemberPhotoUrl(member: MemberForPhoto): string {
  if (member.photoUrl?.trim()) return member.photoUrl.trim();
  if (member.jurisdiction.toUpperCase() === "PROVINCIAL") {
    const slug = member.id.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `${OLA_MPP_PHOTO_BASE}/${encodeURIComponent(slug)}.jpg`;
  }
  return getFederalPhotoUrl(member.id);
}

/**
 * Returns the 44th Parliament fallback URL for a federal MP (use when 45th returns 404).
 */
export function getFederalPhotoFallbackUrl(memberId: string): string {
  return getMemberPhotoUrl44(memberId);
}

/**
 * Returns true if the given URL is a federal 45th Parliament photo (so we can fallback to 44th on error).
 */
export function isFederal45PhotoUrl(url: string): boolean {
  return url.includes("OfficialMpPhotos/45");
}
