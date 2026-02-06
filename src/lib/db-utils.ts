import { prisma } from "@/lib/db";
import type { Jurisdiction } from "@/lib/mock-data";

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
      ...(jurisdiction && { jurisdiction }),
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
