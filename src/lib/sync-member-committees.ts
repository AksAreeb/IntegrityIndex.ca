/**
 * Syncs MemberCommittee links by matching scraper committee strings to Committee table.
 * Fetches committee members from OpenParliament and creates MemberCommittee relations.
 * Used by sync-engine Step E2.
 */

import axios from "axios";
import { prisma } from "@/lib/db";

const FINA_OPENPARLIAMENT_URL =
  "https://api.openparliament.ca/committees/finance/?format=json";
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "IntegrityIndex.ca/1.0 (https://integrityindex.ca)";

/** Committee names in our DB (Committee.name) -> OpenParliament API path */
const COMMITTEE_SOURCES: Record<string, string> = {
  "Standing Committee on Finance (FINA)": "finance",
};

/** Fallback names when API fails */
const FINA_FALLBACK_NAMES = [
  "Peter Fonseca",
  "Jasraj Singh Hallan",
  "Gabriel Ste-Marie",
  "Yvan Baker",
  "Adam Chambers",
  "Francesco Sorbara",
  "Philip Lawrence",
  "Dan Albas",
  "Taylor Bachrach",
  "Daniel Blaikie",
];

export async function syncMemberCommittees(): Promise<number> {
  let linked = 0;

  for (const [committeeName, apiPath] of Object.entries(COMMITTEE_SOURCES)) {
    const committee = await prisma.committee.findUnique({
      where: { name: committeeName },
    });
    if (!committee) continue;

    const federalMembers = await prisma.member.findMany({
      where: { jurisdiction: "FEDERAL" },
      select: { id: true, name: true },
    });
    const nameToMember = new Map<string, { id: string }>();
    for (const m of federalMembers) {
      const raw = m.name.trim().toLowerCase().replace(/\s+/g, " ");
      nameToMember.set(raw, { id: m.id });
      if (raw.includes(",")) {
        const [last, first] = raw.split(",").map((s) => s.trim());
        if (first && last) nameToMember.set(`${first} ${last}`, { id: m.id });
      } else {
        const parts = raw.split(" ");
        if (parts.length >= 2) {
          const last = parts.pop()!;
          const first = parts.join(" ");
          nameToMember.set(`${last}, ${first}`, { id: m.id });
        }
      }
    }

    let candidateNames: string[] = [];
    try {
      const { data } = await axios.get<{
        members?: Array<{ politician?: { name?: string } }>;
        politicians?: Array<{ name?: string }>;
        current_members?: Array<{ name?: string }>;
      }>(`https://api.openparliament.ca/committees/${apiPath}/?format=json`, {
        timeout: FETCH_TIMEOUT_MS,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      const members = data?.members ?? data?.politicians ?? data?.current_members ?? [];
      for (const entry of members) {
        const name =
          (entry as { politician?: { name?: string } }).politician?.name ??
          (entry as { name?: string }).name;
        if (name && typeof name === "string") candidateNames.push(name.trim());
      }
      if (candidateNames.length === 0 && committeeName.includes("Finance")) {
        candidateNames = FINA_FALLBACK_NAMES;
      }
    } catch {
      if (committeeName.includes("Finance")) candidateNames = FINA_FALLBACK_NAMES;
    }

    const seenIds = new Set<string>();
    for (const rawName of candidateNames) {
      const norm = rawName.trim().toLowerCase().replace(/\s+/g, " ");
      const member = nameToMember.get(norm);
      if (!member) {
        const last = norm.split(" ").pop();
        if (last) {
          const found = federalMembers.find((m) =>
            m.name.toLowerCase().includes(last)
          );
          if (found && !seenIds.has(found.id)) {
            try {
              await prisma.memberCommittee.upsert({
                where: {
                  memberId_committeeId: {
                    memberId: found.id,
                    committeeId: committee.id,
                  },
                },
                create: { memberId: found.id, committeeId: committee.id },
                update: {},
              });
              linked++;
              seenIds.add(found.id);
            } catch {
              /* duplicate, skip */
            }
          }
        }
        continue;
      }
      if (seenIds.has(member.id)) continue;
      try {
        await prisma.memberCommittee.upsert({
          where: {
            memberId_committeeId: {
              memberId: member.id,
              committeeId: committee.id,
            },
          },
          create: { memberId: member.id, committeeId: committee.id },
          update: {},
        });
        linked++;
        seenIds.add(member.id);
      } catch {
        /* duplicate, skip */
      }
    }
  }

  return linked;
}
