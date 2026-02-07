import { prisma } from "@/lib/prisma";
import type { Jurisdiction } from "@/types";
import { slugFromName } from "@/lib/slug";

/**
 * Retroactively generates slugs for members missing slug. Uses full name (e.g. "Michael Ford" -> "michael-ford").
 * If that slug is taken, appends riding (e.g. "michael-ford-york-south"), then -1, -2 if still taken.
 */
export async function backfillSlugsForMembers(): Promise<{ updated: number }> {
  const withoutSlug = await prisma.member.findMany({
    where: { OR: [{ slug: null }, { slug: "" }] },
    select: { id: true, name: true, riding: true },
  });

  const usedSlugs = new Set<string>(
    (await prisma.member.findMany({ where: { slug: { not: null } }, select: { slug: true } }))
      .map((m) => m.slug)
      .filter((s): s is string => !!s)
  );

  for (const m of withoutSlug) {
    const baseSlug = slugFromName(m.name);
    let slug = baseSlug;
    if (!usedSlugs.has(slug)) {
      usedSlugs.add(slug);
    } else {
      const ridingPart = slugFromName(m.riding);
      const withRiding = ridingPart ? `${baseSlug}-${ridingPart}` : baseSlug;
      if (!usedSlugs.has(withRiding)) {
        slug = withRiding;
        usedSlugs.add(slug);
      } else {
        let n = 1;
        do {
          slug = `${withRiding}-${n}`;
          n++;
        } while (usedSlugs.has(slug));
        usedSlugs.add(slug);
      }
    }
    await prisma.member.update({
      where: { id: m.id },
      data: { slug },
    });
  }

  return { updated: withoutSlug.length };
}

/**
 * Finds the MP assigned to the given electoral district ID (riding number).
 * Handles FEDERAL vs PROVINCIAL: pass jurisdiction to filter, or omit to match any.
 * Member.id is stored as string (e.g. "1".."338" for federal ridings).
 */
export async function getMemberByRiding(
  ridingNum: number,
  jurisdiction?: Jurisdiction
): Promise<{ id: string; name: string; riding: string; party: string; jurisdiction: string } | null> {
  const id = String(ridingNum);
  const member = await prisma.member.findFirst({
    where: {
      id,
      ...(jurisdiction && jurisdiction !== "ALL" && { jurisdiction }),
    },
    select: {
      id: true,
      name: true,
      riding: true,
      party: true,
      jurisdiction: true,
    },
  });
  return member;
}
