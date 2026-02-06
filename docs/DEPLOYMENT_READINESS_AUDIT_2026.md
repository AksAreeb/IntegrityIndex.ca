# Deployment Readiness Audit — IntegrityIndex.ca (2026)

**Audit date:** February 5, 2026  
**Scope:** Pre–public launch; Vercel + Supabase production.

---

## 1. ENVIRONMENT & CONFIGURATION

### next.config.ts
- **serverExternalPackages:** Correctly set at top level: `["@prisma/client", "pg"]`. In Next.js 15+, this is stable (no longer under `experimental`). ✓
- **experimental.optimizePackageImports:** Correct for tree-shaking `lucide-react` and `recharts`. ✓
- **images.remotePatterns:** OurCommons, OLA, OpenNorth — appropriate for MP photos. ✓

### Secrets
- **No hardcoded secrets.** All sensitive values use `process.env`:
  - `DATABASE_URL` — `src/lib/db.ts`
  - `FINNHUB_API_KEY` — `src/lib/admin-health.ts`, `src/lib/api/stocks.ts`
  - `NODE_ENV` — `src/lib/db.ts`, `src/lib/logger.ts`
- Public URLs (OurCommons, CIEC, OLA) are government CDN/API endpoints, not secrets. ✓

**Verdict:** No red flags. Ensure Vercel env vars are set: `DATABASE_URL` (use Supabase pooled port **6543**), `FINNHUB_API_KEY`.

---

## 2. DATABASE & PRISMA (PRODUCTION MODE)

### Prisma Singleton (`src/lib/db.ts`)
- Single `pg.Pool` and single `PrismaClient` on `globalThis`; avoids connection leaks under hot-reload and multiple request handlers. ✓
- **Risk:** `new Pool({ connectionString })` uses **pg default max connections (10)** per Node process. On Vercel, each serverless instance gets its own process; 1,000 concurrent users → many instances → each opening up to 10 connections can exhaust **Supabase connection quota** (e.g. 15–50 on free tier).
- **Recommendation:** Set an explicit pool size per instance, e.g. `new Pool({ connectionString, max: 2 })`, so total connections stay within Supabase limits. Supabase recommends using **pooled connection string (port 6543)** — confirmed in comment; ensure production uses it.

### Schema indexes (map/ticker performance)
- **Member:** `officialId` has `@unique` → unique index exists. ✓
- **TradeTicker:** No index on `date`. `/api/trades` uses `orderBy: { date: "desc" }, take: 24` — a composite or `date` index would speed this up under load.
- **Disclosure:** No index on `disclosureDate`. Analytics and timelines filter/sort by this; add an index for scale.

**Recommendation:** Add to `schema.prisma`:
```prisma
model TradeTicker {
  // ...
  @@index([date(sort: Desc)])
  @@index([memberId])
}
model Disclosure {
  // ...
  @@index([disclosureDate])
}
```
Then create and run a migration.

**Verdict:** Singleton is correct. **Red flags:** (1) Pool `max` not set → risk of "Too many connections" under spike; (2) Missing indexes on `TradeTicker.date` and `Disclosure.disclosureDate` for fast map/ticker loading.

---

## 3. SCRAPER RESILIENCY (THE 2026 TEST)

### scripts/sync.ts
- **Phase 1 (Member Discovery):** Calls `discoverMembers()` with **no try/catch**. If OurCommons is down and fallback roster is missing or invalid, or if Prisma fails, the entire sync crashes and exits with code 1. ✓ Red flag
- **Phase 2 (CIEC):** Per-MP `try/catch` — failed MP is skipped with a warning; sync continues. ✓
- **Rate limiting:** `delayMs = 150` between federal members in the CIEC loop. ✓ Reduces risk of IP blocking.
- **LEGISinfo:** Wrapped in try/catch; failure is logged, sync continues. ✓

### Scrapers
- **ciecScraper.ts:** `resolveDeclarationIdByMemberName` tries two URLs with try/catch per URL; `scrapeCIEC` returns `[]` on failure. No delay between registry and declaration fetches for the same member (only between members in sync.ts). ✓ Generally resilient.
- **memberScraper.ts:** No try/catch; relies on `fetchFederalMembers()` in `sync.ts` which returns `[]` on failure. If `fetchFederalMembers()` returns 0, sync exits early without crashing. If it returns data and `discoverMembers()` throws (e.g. DB error), sync crashes. ✓ Phase 1 should be wrapped in try/catch.

**Recommendation:** Wrap Phase 1 in try/catch; on failure log and optionally use fallback roster or exit gracefully instead of process.exit(1).

**Verdict:** **Red flag:** Phase 1 (Member Discovery) not wrapped in try/catch — government site outage or DB error can crash the whole sync.

---

## 4. FRONTEND & MAP PERFORMANCE

### TopoJSON vs GeoJSON (343-seat map)
- **GovernanceMap** prefers TopoJSON: `TOPOJSON_FEDERAL_PATH = "/data/canada_ridings_2023.topojson"`, fallback `GEOJSON_FEDERAL_PATH = "/data/canada_ridings.json"`. ✓
- **Actual assets:** `public/data/` contains only **canada_ridings.json**. File **canada_ridings_2023.topojson is missing**. Map will always use the fallback GeoJSON. If that file is full 343-seat GeoJSON and unsimplified, it can be **>1MB** and slow. ✓ Red flag
- **Docs:** `docs/MAP_GEOJSON_2023.md` correctly describes producing a &lt;1MB TopoJSON and placing it at `public/data/canada_ridings_2023.topojson`. Follow that before launch.

**Note:** `/api/geojson/federal` returns **Natural Earth provinces** (13 features), not 343 ridings. It is not used by the federal map (map uses static files). No change needed for map, but be aware the API is not the 343-riding source.

### Loading states
- **GovernanceMap:** Has `loading` state and **MapSkeleton** ("Loading map data..."); error state shows message. ✓
- **GovernanceMapDynamic:** Uses `dynamic(..., { loading: () => <MapSkeleton /> })`. ✓
- **StockTicker (TradeTicker):** Uses SWR but does **not** distinguish "loading" from "empty". When `data === undefined`, `items.length === 0` shows "Waiting for new 2026 disclosures...", which looks like empty state, not loading. ✓ Red flag (UX)

**Recommendation:** For StockTicker, use SWR’s `isValidating` or `isLoading`: show a short "Loading…" or skeleton when `!data && !error`, and "Waiting for new 2026 disclosures..." only when `data && data.items?.length === 0`.

**Verdict:** **Red flags:** (1) **canada_ridings_2023.topojson missing** — add per MAP_GEOJSON_2023.md or ensure fallback GeoJSON is &lt;1MB; (2) Ticker has no explicit loading state.

---

## 5. THE "2026 REALITY" CHECK

### 343-seat (45th Parliament) vs 338
- **Sync / roster:** Targets 343 (`FEDERAL_MP_COUNT_45TH = 343`, `FEDERAL_TARGET = 343`); warns when 338 is detected (44th Parliament). ✓
- **memberScraper.ts** JSDoc still says "target 338" — **outdated comment**; should say 343. ✓ Minor
- **Map:** Designed for 343-seat 2023 Representation Order; data-join by riding key. ✓

### MP photos (dynamic MemberIdImages URL)
- **Federal:** `getMemberPhotoUrl(memberId)` in `ciecScraper.ts` and `member-photos.ts` uses dynamic URL:  
  `https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMpPhotos/45/${memberId}.jpg`  
  with 44th Parliament fallback. ✓
- **MemberPhoto.tsx** uses `getMemberPhotoUrl(member)` from `member-photos.ts`; no local file assumption. ✓
- **next.config images.remotePatterns** includes `www.ourcommons.ca`. ✓

**Verdict:** Map and discovery target 343; MP photos use dynamic OurCommons URLs. Only fix: update memberScraper JSDoc to "target 343".

---

# DEPLOYMENT RED-FLAG LIST

**Do not push to Vercel/Main until these are addressed if you want a stable public launch.**

1. **Database connections:** pg `Pool` has no `max` → risk of "Too many connections" on Supabase when traffic spikes. Set `max: 2` (or similar) in `src/lib/db.ts` and ensure production uses Supabase **pooled** URL (port 6543).

2. **Missing TopoJSON:** `public/data/canada_ridings_2023.topojson` is missing. Either add it per `docs/MAP_GEOJSON_2023.md` (recommended, &lt;1MB) or ensure `public/data/canada_ridings.json` is simplified and under ~1MB for 343 ridings.

3. **Sync Phase 1 not fault-tolerant:** `scripts/sync.ts` Phase 1 (Member Discovery) has no try/catch. If OurCommons or the DB fails, the entire sync process crashes. Wrap Phase 1 in try/catch and handle failure (e.g. log, use fallback roster, or exit with clear message).

4. **Missing DB indexes:** Add indexes for production load:
   - `TradeTicker`: `@@index([date(sort: Desc)])`, and optionally `@@index([memberId])` (if not covered by FK).
   - `Disclosure`: `@@index([disclosureDate])`.
   Create and run a migration before launch.

5. **StockTicker loading state:** Ticker does not show a distinct "Loading…" state; initial load shows "Waiting for new 2026 disclosures...". Use SWR `isValidating`/`isLoading` to show "Loading…" until first response, then show empty message only when data is loaded and empty.

6. **Environment variables on Vercel:** Confirm `DATABASE_URL` (pooled, 6543) and `FINNHUB_API_KEY` are set in Vercel project settings. Missing `DATABASE_URL` will throw at runtime in any API route using Prisma.

---

## Summary Table

| Area                    | Status   | Critical issue(s) |
|-------------------------|----------|--------------------|
| Env & config            | OK       | None |
| DB & Prisma             | Fix      | Pool `max`; indexes on `date`, `disclosureDate` |
| Scraper resiliency      | Fix      | Phase 1 try/catch |
| Frontend & map          | Fix      | TopoJSON missing; ticker loading state |
| 2026 reality (343/URLs) | OK       | JSDoc "338" → "343" only |

Addressing the six red flags above will significantly reduce risk of outages, timeouts, and poor UX on public launch.
