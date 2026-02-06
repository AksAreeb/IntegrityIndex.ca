import { getMemberPhotoUrl44 } from "@/lib/scrapers/ciecScraper";

const FEDERAL_MEMBER_PHOTOS_BASE = "https://www.ourcommons.ca/Member-Photos";
const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/styles/mpp_profile/public/mpp-photos";

export interface MemberForPhoto {
  id: string;
  jurisdiction: string;
  photoUrl?: string | null;
  /** Federal: House of Commons official ID (for Member-Photos URL). */
  officialId?: string | null;
}

/**
 * Returns the primary photo URL for a member.
 * Federal: https://www.ourcommons.ca/Member-Photos/[MemberID].jpg (using officialId or id).
 * Provincial (MPP): Use stored photoUrl (from OpenNorth image field when available), else OLA CDN by slug.
 */
export function getMemberPhotoUrl(member: MemberForPhoto): string {
  if (member.photoUrl?.trim()) return member.photoUrl.trim();
  if (member.jurisdiction.toUpperCase() === "PROVINCIAL") {
    const slug = member.id.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `${OLA_MPP_PHOTO_BASE}/${encodeURIComponent(slug)}.jpg`;
  }
  const memberId = (member.officialId ?? member.id).trim();
  return `${FEDERAL_MEMBER_PHOTOS_BASE}/${encodeURIComponent(memberId)}.jpg`;
}

/**
 * Federal fallback: 44th Parliament OfficialMpPhotos (when Member-Photos 404s).
 */
export function getFederalPhotoFallbackUrl(memberId: string): string {
  return getMemberPhotoUrl44(memberId);
}

/**
 * True if URL is the Member-Photos path (so we can try 44th fallback on error).
 */
export function isFederalMemberPhotosUrl(url: string): boolean {
  return url.includes("Member-Photos/");
}
