/**
 * Durable Batched Sync: upserts Federal MPs and Ontario MPPs with limit/offset.
 * Uses Promise.race with a 50s timeout so Vercel doesn't kill the process.
 * Updates party and imageUrl (photoUrl); uses Prisma upsert to prevent duplicates.
 * After the batch, runs enhance-members logic for photo fallbacks when time allows.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFederalMembers } from "@/lib/sync";
import { fetchOntarioMpps } from "@/lib/scrapers/ontario";
import { getMemberPhotoUrl as getFederalPhotoUrl } from "@/lib/scrapers/ciecScraper";
import { slugFromName } from "@/lib/slug";
import { enhanceMembers } from "@/lib/enhance-members";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TIME_LIMIT_MS = 50_000;

const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/member/profile-photo";

function normalize(s: string | null | undefined, defaultVal: string): string {
  const t = (s ?? "").trim();
  return t && t !== "(not available)" ? t : defaultVal;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const name = (fullName ?? "").trim();
  if (!name) return { firstName: "Unknown", lastName: "Unknown" };
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function timeout(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));
}

function requireAuth(request: Request, searchParams: URLSearchParams): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const querySecret = searchParams.get("secret");
  const ok = secret && (auth === `Bearer ${secret}` || querySecret === secret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unauthorized = requireAuth(request, searchParams);
  if (unauthorized) return unauthorized;

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  const startTime = Date.now();

  try {
    const [federalList, ontarioList] = await Promise.all([
      fetchFederalMembers(),
      fetchOntarioMpps().catch(() => [] as Awaited<ReturnType<typeof fetchOntarioMpps>>),
    ]);

    type FederalItem = {
      type: "federal";
      id: string;
      name: string;
      firstName: string;
      lastName: string;
      riding: string;
      party: string;
    };
    type ProvincialItem = {
      type: "provincial";
      id: string;
      name: string;
      firstName: string;
      lastName: string;
      riding: string;
      party: string;
      photoUrl: string;
      slug: string;
    };

    const federalItems: FederalItem[] = federalList.map((m) => {
      const name = normalize(m.name, "Unknown");
      const { firstName, lastName } = splitName(name);
      return {
        type: "federal" as const,
        id: m.id,
        name,
        firstName,
        lastName,
        riding: normalize(m.riding, "Unknown"),
        party: normalize(m.party, "Independent"),
      };
    });

    const provincialItems: ProvincialItem[] = ontarioList.map((m) => {
      const name = normalize(m.name, "Unknown");
      const { firstName, lastName } = splitName(name);
      const olaSlug = (m as { olaSlug?: string }).olaSlug ?? m.id.replace(/^ON-/, "");
      const photoUrl =
        (m as { imageUrl?: string }).imageUrl?.trim() ||
        `${OLA_MPP_PHOTO_BASE}/${olaSlug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("_")}.jpg`;
      return {
        type: "provincial" as const,
        id: m.id,
        name,
        firstName,
        lastName,
        riding: normalize(m.riding, "Unknown"),
        party: normalize(m.party, "Independent"),
        photoUrl,
        slug: slugFromName(name),
      };
    });

    const combined = [...federalItems, ...provincialItems];
    const total = combined.length;
    const batch = combined.slice(offset, offset + limit);

    let upserted = 0;
    let timedOut = false;

    for (const item of batch) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(1000, TIME_LIMIT_MS - elapsed);
      const timeoutPromise = timeout(remaining);

      const doUpsert = async () => {
        if (item.type === "federal") {
          await prisma.member.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name,
              firstName: item.firstName,
              lastName: item.lastName,
              riding: item.riding,
              party: item.party,
              jurisdiction: "FEDERAL",
              chamber: "House of Commons",
              photoUrl: getFederalPhotoUrl(item.id),
            },
            update: {
              name: item.name,
              firstName: item.firstName,
              lastName: item.lastName,
              riding: item.riding,
              party: item.party,
              photoUrl: getFederalPhotoUrl(item.id),
            },
          });
        } else {
          await prisma.member.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name,
              firstName: item.firstName,
              lastName: item.lastName,
              riding: item.riding,
              party: item.party,
              jurisdiction: "PROVINCIAL",
              chamber: "Legislative Assembly",
              photoUrl: item.photoUrl,
              slug: item.slug,
            },
            update: {
              name: item.name,
              firstName: item.firstName,
              lastName: item.lastName,
              riding: item.riding,
              party: item.party,
              photoUrl: item.photoUrl,
              slug: item.slug,
            },
          });
        }
      };

      const result = await Promise.race([doUpsert().then(() => "ok"), timeoutPromise]);
      if (result === "timeout") {
        timedOut = true;
        break;
      }
      upserted += 1;
    }

    let enhanceResult: { openParlUpdated: number; photoUpdated: number } | null = null;
    if (!timedOut && Date.now() - startTime < TIME_LIMIT_MS - 5000) {
      try {
        const raced = await Promise.race([
          enhanceMembers(),
          timeout(5000),
        ]);
        if (raced !== "timeout") enhanceResult = raced;
      } catch {
        // non-fatal
      }
    }

    const nextOffset = offset + batch.length;
    const done = nextOffset >= total;

    return NextResponse.json({
      ok: true,
      limit,
      offset,
      nextOffset: done ? null : nextOffset,
      total,
      upserted,
      timedOut,
      done,
      elapsedMs: Date.now() - startTime,
      ...(enhanceResult && { enhance: enhanceResult }),
    });
  } catch (e) {
    console.error("[sync] GET failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
