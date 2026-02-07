/**
 * Member Discovery — 45th Parliament roster from OurCommons.
 * Fetches the real list from OurCommons (export JSON = machine-readable version of
 * https://www.ourcommons.ca/members/en/search) and upserts names, ridings, parties into Member table.
 * Source: https://www.ourcommons.ca/en/members/export/json
 */

import { prisma } from "@/lib/prisma";
import { fetchFederalMembers } from "@/lib/sync";
import { getMemberPhotoUrl } from "@/lib/scrapers/ciecScraper";
import { slugFromName } from "@/lib/slug";

const FEDERAL_CHAMBER = "House of Commons";
const JURISDICTION_FEDERAL = "FEDERAL";

/**
 * Matches sync.ts slugify so member id is identical to how sync/seed created them.
 * Used only for the fallback id when OurCommons does not provide an id.
 */
function slugify(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Party should come from OurCommons CaucusShortName (or Party) in the sync layer.
 * If it's missing, empty, or wrongly set to the member's name, default to Independent.
 */
function partyForUpsert(party: string, name: string): string {
  const p = (party ?? "").trim();
  if (!p) return "Independent";
  if (p === (name ?? "").trim()) return "Independent";
  return p;
}

/**
 * Resolves a unique slug from the member's full name. Clean URLs: "Michael Ford" -> "michael-ford".
 * If that slug is taken, appends riding (e.g. "michael-ford-york-south"), then -1, -2 if still taken.
 */
function resolveUniqueSlugForMember(
  name: string,
  riding: string,
  usedSlugs: Set<string>
): string {
  const baseSlug = slugFromName(name);
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }
  const ridingPart = slugFromName(riding);
  const withRiding = ridingPart ? `${baseSlug}-${ridingPart}` : baseSlug;
  if (!usedSlugs.has(withRiding)) {
    usedSlugs.add(withRiding);
    return withRiding;
  }
  let n = 1;
  let slug: string;
  do {
    slug = `${withRiding}-${n}`;
    n++;
  } while (usedSlugs.has(slug));
  usedSlugs.add(slug);
  return slug;
}

/** Heuristic: Prisma CUIDs are ~25 chars and start with 'c'. */
function isCuid(id: string): boolean {
  return id.length >= 24 && /^c[0-9a-z]+$/i.test(id);
}

/**
 * Returns a slug safe for the member: full-name slug (e.g. michael-ford). If that slug is taken
 * by another member, appends riding (e.g. michael-ford-york-south), then -1, -2. Logs a warning on collision.
 */
async function slugForUpdate(
  memberId: string,
  proposedSlug: string,
  memberName: string,
  memberRiding: string,
  usedSlugs: Set<string>
): Promise<string> {
  const existingSlug = await prisma.member.findFirst({
    where: { slug: proposedSlug, id: { not: memberId } },
    select: { id: true, name: true },
  });
  if (existingSlug) {
    console.warn(
      `[memberScraper] Slug collision: "${proposedSlug}" already used by another member (id=${existingSlug.id}, name=${existingSlug.name}). Assigning riding-suffixed slug to "${memberName}" (id=${memberId}).`
    );
    return resolveUniqueSlugForMember(memberName, memberRiding, usedSlugs);
  }
  usedSlugs.add(proposedSlug);
  return proposedSlug;
}

/**
 * Fetches the real 45th Parliament list from OurCommons and upserts into Member table.
 * Matches sync id generation (id = officialId || slugify(name+riding)), resolves by id then officialId,
 * and ensures slugs are unique before create to avoid "Unique constraint failed on (slug)".
 * @returns Number of members upserted (target 343).
 */
export async function discoverMembers(): Promise<number> {
  const records = await fetchFederalMembers();
  if (records.length === 0) {
    console.warn("[memberScraper] No federal members returned from OurCommons export.");
    return 0;
  }

  const usedSlugs = new Set<string>(
    (
      await prisma.member.findMany({
        where: { slug: { not: null } },
        select: { slug: true },
      })
    )
      .map((m) => m.slug)
      .filter((s): s is string => !!s)
  );

  let upserted = 0;
  for (const mp of records) {
    const rawId = (mp.id ?? "").trim();
    const id =
      rawId || slugify(mp.name + mp.riding);
    const officialId = /^\d+$/.test(rawId) ? rawId : null;
    const party = partyForUpsert(mp.party, mp.name);
    const photoUrl = getMemberPhotoUrl(officialId ?? id);

    const existingByOfficialId =
      officialId != null
        ? await prisma.member.findFirst({
            where: { officialId },
            select: { id: true, slug: true },
          })
        : null;

    if (existingByOfficialId) {
      const canonicalId = existingByOfficialId.id;
      const proposedSlug =
        existingByOfficialId.slug?.trim() || slugFromName(mp.name);
      const slug = await slugForUpdate(
        canonicalId,
        proposedSlug,
        mp.name,
        mp.riding,
        usedSlugs
      );
      await prisma.member.update({
        where: { id: canonicalId },
        data: {
          name: mp.name,
          riding: mp.riding,
          party,
          photoUrl,
          officialId: officialId ?? undefined,
          slug,
        },
      });
      upserted++;
      continue;
    }

    const existingById = await prisma.member.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (existingById) {
      const otherWithSameOfficialId =
        officialId != null && !isCuid(id)
          ? await prisma.member.findFirst({
              where: { officialId, id: { not: id } },
              select: { id: true, slug: true },
            })
          : null;
      if (otherWithSameOfficialId && isCuid(otherWithSameOfficialId.id)) {
        const canonicalId = otherWithSameOfficialId.id;
        const proposedSlug =
          otherWithSameOfficialId.slug?.trim() || slugFromName(mp.name);
        const slug = await slugForUpdate(
          canonicalId,
          proposedSlug,
          mp.name,
          mp.riding,
          usedSlugs
        );
        await prisma.member.update({
          where: { id: canonicalId },
          data: {
            name: mp.name,
            riding: mp.riding,
            party,
            photoUrl,
            officialId: officialId ?? undefined,
            slug,
          },
        });
        upserted++;
        continue;
      }

      const proposedSlug =
        existingById.slug?.trim() || slugFromName(mp.name);
      const slug = await slugForUpdate(
        id,
        proposedSlug,
        mp.name,
        mp.riding,
        usedSlugs
      );
      await prisma.member.update({
        where: { id },
        data: {
          name: mp.name,
          riding: mp.riding,
          party,
          photoUrl,
          officialId: officialId ?? undefined,
          slug,
        },
      });
      upserted++;
      continue;
    }

    const slug = resolveUniqueSlugForMember(mp.name, mp.riding, usedSlugs);
    await prisma.member.create({
      data: {
        id,
        slug,
        officialId,
        name: mp.name,
        riding: mp.riding,
        party,
        jurisdiction: JURISDICTION_FEDERAL,
        chamber: FEDERAL_CHAMBER,
        photoUrl,
      },
    });
    upserted++;
  }

  return upserted;
}
