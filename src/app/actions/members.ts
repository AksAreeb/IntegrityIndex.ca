"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/** Member row shape returned by fuzzy search and list actions */
export interface MemberSearchResult {
  id: string;
  name: string;
  riding: string;
  party: string;
  jurisdiction: string;
  chamber: string | null;
  photoUrl: string | null;
  officialId: string | null;
  /** Present when from fuzzy search: relevance score (0–1) */
  rank?: number;
}

/** Fuzzy search using PostgreSQL pg_trgm (trigram) similarity.
 * Requires pg_trgm extension and GIN indexes on Member.name and Member.riding.
 * Typo-tolerant: uses % operator and similarity() for ranking. */
export async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  const q = (query ?? "").trim();
  if (!q) {
    return listMembers(50);
  }

  // pg_trgm: % = similarity > 0.3, similarity() returns 0–1 for ranking
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      riding: string;
      party: string;
      jurisdiction: string;
      chamber: string | null;
      photoUrl: string | null;
      officialId: string | null;
      rank: number;
    }>
  >(
    Prisma.sql`
      SELECT m.id, m.name, m.riding, m.party, m.jurisdiction, m.chamber, m."photoUrl", m."officialId",
        GREATEST(
          COALESCE(similarity(m.name, ${q}), 0),
          COALESCE(similarity(m.riding, ${q}), 0)
        ) AS rank
      FROM "Member" m
      WHERE m.name % ${q} OR m.riding % ${q}
      ORDER BY rank DESC
      LIMIT 50
    `,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    riding: r.riding,
    party: r.party,
    jurisdiction: r.jurisdiction,
    chamber: r.chamber,
    photoUrl: r.photoUrl,
    officialId: r.officialId,
    rank: Number(r.rank),
  }));
}

/** List all members (paginated, limit 50). Used for default state. */
export async function listMembers(limit = 50): Promise<MemberSearchResult[]> {
  const members = await prisma.member.findMany({
    take: limit,
    orderBy: [{ jurisdiction: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      riding: true,
      party: true,
      jurisdiction: true,
      chamber: true,
      photoUrl: true,
      officialId: true,
    },
  });
  return members;
}
