/**
 * Batched sync: upserts Federal MPs and Ontario MPPs with limit/offset.
 * Use ?limit=10&offset=0 (defaults). Stops at 50s to avoid Vercel killing the process.
 * Updates Member party and photo URLs. Uses Prisma upsert to avoid duplicates.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFederalMembers } from "@/lib/sync";
import { fetchOntarioMpps } from "@/lib/scrapers/ontario";
import { getMemberPhotoUrl as getFederalPhotoUrl } from "@/lib/scrapers/ciecScraper";
import { slugFromName } from "@/lib/slug";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TIME_LIMIT_MS = 50_000;

const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/member/profile-photo";

function normalize(s: string | null | undefined, defaultVal: string): string {
  const t = (s ?? "").trim();
  return t && t !== "(not available)" ? t : defaultVal;
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

    type FederalItem = { type: "federal"; id: string; name: string; riding: string; party: string };
    type ProvincialItem = {
      type: "provincial";
      id: string;
      name: string;
      riding: string;
      party: string;
      photoUrl: string;
      slug: string;
    };

    const federalItems: FederalItem[] = federalList.map((m) => ({
      type: "federal" as const,
      id: m.id,
      name: normalize(m.name, "Unknown"),
      riding: normalize(m.riding, "Unknown"),
      party: normalize(m.party, "Independent"),
    }));

    const provincialItems: ProvincialItem[] = ontarioList.map((m) => {
      const olaSlug = (m as { olaSlug?: string }).olaSlug ?? m.id.replace(/^ON-/, "");
      const photoUrl =
        (m as { imageUrl?: string }).imageUrl?.trim() ||
        `${OLA_MPP_PHOTO_BASE}/${olaSlug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("_")}.jpg`;
      return {
        type: "provincial" as const,
        id: m.id,
        name: normalize(m.name, "Unknown"),
        riding: normalize(m.riding, "Unknown"),
        party: normalize(m.party, "Independent"),
        photoUrl,
        slug: slugFromName(m.name),
      };
    });

    const combined = [...federalItems, ...provincialItems];
    const total = combined.length;
    const batch = combined.slice(offset, offset + limit);

    let upserted = 0;
    let timedOut = false;

    for (const item of batch) {
      if (Date.now() - startTime >= TIME_LIMIT_MS) {
        timedOut = true;
        break;
      }

      if (item.type === "federal") {
        await prisma.member
          .upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name,
              riding: item.riding,
              party: item.party,
              jurisdiction: "FEDERAL",
              chamber: "House of Commons",
              photoUrl: getFederalPhotoUrl(item.id),
            },
            update: {
              name: item.name,
              riding: item.riding,
              party: item.party,
              photoUrl: getFederalPhotoUrl(item.id),
            },
          })
          .then(() => { upserted += 1; })
          .catch((err) => console.warn("[sync] Federal upsert failed:", item.id, err));
      } else {
        await prisma.member
          .upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name,
              riding: item.riding,
              party: item.party,
              jurisdiction: "PROVINCIAL",
              chamber: "Legislative Assembly",
              photoUrl: item.photoUrl,
              slug: item.slug,
            },
            update: {
              name: item.name,
              riding: item.riding,
              party: item.party,
              photoUrl: item.photoUrl,
              slug: item.slug,
            },
          })
          .then(() => { upserted += 1; })
          .catch((err) => console.warn("[sync] Provincial upsert failed:", item.id, err));
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
    });
  } catch (e) {
    console.error("[sync] GET failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
