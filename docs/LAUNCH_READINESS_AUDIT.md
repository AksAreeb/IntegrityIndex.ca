# IntegrityIndex.ca — Launch Readiness Audit

**Audit Date:** 2026-02-05  
**Scope:** Button & Interaction Logic, Data & Stock Integrity, Stock Banner, Visual Assets, Maps & GeoJSON, Full-Page Connectivity, Dead Code, Silent Failures

---

## 1. Error & Glitch List

### Critical

| ID | Location | Issue | Recommendation |
|----|----------|-------|----------------|
| C1 | `src/components/StockTicker.tsx:67` | **Build Error:** `dataUpdatedAt` does not exist on SWR response (TanStack Query syntax mixed in). | Apply same fix as IntegrityTicker: use `lastUpdated` state + `onSuccess` callback. |
| C2 | `src/components/IntegrityTicker.tsx` | **Dead Code:** Component is never imported or rendered. AppShell uses `StockTicker`, not IntegrityTicker. | Either wire IntegrityTicker into the app (e.g. alternate banner) or remove. |
| C3 | `src/components/GovernanceMap.tsx:148` | **Map→Profile Mismatch:** `handleClick` passes `enname` (riding name/slug from GeoJSON) to `/mps/[riding-id]`. `getMemberByRidingId` looks up by `member.id`. Federal/Provincial member IDs are `FED-{slug}` or `ON-{slug}`; GeoJSON ridingId may be `"toronto-centre"`. Mismatch may cause 404s or wrong member. | Align GeoJSON `ridingId` with `member.id` or add a riding-name → member lookup (e.g. by `riding` field). |

### Warning

| ID | Location | Issue | Recommendation |
|----|----------|-------|----------------|
| W1 | `src/app/bills/BillsDataTable.tsx`, `LegislationTable.tsx` | Link `href={/mps/${bill.stakeholderMemberIds[i] ?? ""}}` can produce `/mps/` if arrays are misaligned. | Ensure `stakeholderMemberIds` and `stakeholderNames` stay in sync; validate before rendering. |
| W2 | `src/components/IntegrityTicker.tsx`, `StockTicker.tsx` | Fetcher: `fetch(url).then(res => res.ok ? res.json() : { items: [] })` — network errors (fetch throws) are unhandled. SWR catches them but returns `error` state; UI does not show error. | Consider surfacing fetch/network errors (e.g. "Unable to load trades") instead of silent fallback. |
| W3 | `src/components/MemberPhoto.tsx` vs `MembersClient.tsx` | Two implementations: shared `MemberPhoto` uses `<img>`, MembersClient uses `next/image`. Both have `/avatars/placeholder.svg` fallback. | Standardize on one implementation (prefer shared MemberPhoto with next/image if possible). |
| W4 | `src/app/mps/page.tsx:40` | `<a href="/api/sync">` triggers GET sync. No loading/feedback; user may not know sync started. | Add loading state or toast; consider Server Action instead of raw GET link. |

### UI/UX

| ID | Location | Issue | Recommendation |
|----|----------|-------|----------------|
| U1 | `src/app/page.tsx:89` | `href="#live-ledger-ticker"` — valid anchor; scrolls to ticker. | OK. Consider smooth scroll. |
| U2 | `src/components/AppShell.tsx` | Nav links: Home, Members, Representatives, Map, Legislation, Analytics, About. `Lab` and `Admin` exist but are not in nav. | Intentional. Document if Lab/Admin are internal-only. |
| U3 | `src/app/mps/page.tsx` | When `members.length === 0`, shows "Sync roster now" link. | OK. |

---

## 2. Button & Interaction Logic

### Verified OK

| Component | Handler / Link | Target | Status |
|-----------|----------------|--------|--------|
| AppShell | `Link href="/"` | `/` | OK |
| AppShell | `Link href={item.href}` | `/`, `/members`, `/mps`, `/explore`, `/legislation`, `/analytics`, `/about` | OK |
| BillsDataTable | `Link href={/mps/${memberId}}` | `/mps/[riding-id]` | OK (member ID) |
| LegislationTable | Same | Same | OK |
| MembersDataTable | `Link href={/mps/${m.id}}` | `/mps/[riding-id]` | OK |
| MembersClient | `Link href={/member/${member.id}}` | `/member/[id]` | OK |
| StockTicker | `Link href={/mps/${item.memberId}}` | `/mps/[riding-id]` | OK |
| DashboardMapAndLeaders | `Link href={/mps/${item.id}}` | `/mps/[riding-id]` | OK |
| GlobalSearch | `goTo(opt.path)` | `/mps/...`, `/mps?q=...` | OK |
| error.tsx, global-error.tsx | `onClick={reset}`, `href="/"` | Reset + home | OK |
| BillCardList, BillsDataTable, LobbyistHeatmap, etc. | `onClick` toggles | Local state | OK |

### Flagged

| Component | Issue |
|-----------|-------|
| `src/app/page.tsx:89` | `href="#live-ledger-ticker"` — anchor link; valid. |
| `src/app/mps/page.tsx:40` | `href="/api/sync"` — GET request; no loading UI. |

---

## 3. Data & Stock Integrity

| Check | Status |
|-------|--------|
| `/api/trades` fetches from `TradeTicker` table | OK |
| Stock symbols passed to formatting | OK (`symbol` required in `LiveTickerItem` / `TickerItem`) |
| Tickers null-handling | API maps `t.symbol`; schema has `symbol` required. OK |

---

## 4. Stock Banner (IntegrityTicker / StockTicker)

| Check | IntegrityTicker | StockTicker |
|-------|-----------------|-------------|
| useSWR/fetch | useSWR + onSuccess | useSWR (has `dataUpdatedAt` bug) |
| Error handling | Fetcher returns `{ items: [] }` on !res.ok | Same |
| "Live" status | `lastUpdated` + onSuccess | Uses `dataUpdatedAt` (broken) |
| Network lag | lastUpdated only set on success; isLive false if no success | Same intent, but dataUpdatedAt invalid |
| Used in app | No (dead code) | Yes (AppShell) |

---

## 5. Visual Assets (Profile Pics)

| Component | Fallback | Status |
|-----------|----------|--------|
| `MemberPhoto` (shared) | `onError` → `el.src = PLACEHOLDER_AVATAR`; federal 44th fallback | OK |
| `MembersClient` MemberPhoto | `onError` → `setError(true)` → `src = PLACEHOLDER_AVATAR` | OK |
| `StockTicker` | Uses shared MemberPhoto | OK |

**Fallback path:** `/avatars/placeholder.svg` — always used on error.

---

## 6. Maps & GeoJSON

| Check | Status |
|-------|--------|
| `FEDERAL_URL_PRIMARY` | Imported from `@/lib/constants` |
| `PROVINCIAL_URL_PRIMARY` | Imported from `@/lib/constants` |
| `normalizeGeoJson` | Handles `!data`, non-object, empty features; returns `{ type: "FeatureCollection", features: [] }` |

---

## 7. Full-Page Connectivity

| Nav Link | Route | page.tsx | Status |
|----------|-------|----------|--------|
| / | Home | `src/app/page.tsx` | OK |
| /members | Members | `src/app/members/page.tsx` | OK |
| /mps | Representatives | `src/app/mps/page.tsx` | OK |
| /explore | Map | `src/app/explore/page.tsx` | OK |
| /legislation | Legislation | `src/app/legislation/page.tsx` | OK |
| /analytics | Analytics | `src/app/analytics/page.tsx` | OK |
| /about | About | `src/app/about/page.tsx` | OK |
| /dashboard | Dashboard | `src/app/dashboard/page.tsx` | OK (linked from MemberProfileView) |
| /admin/status | Admin | `src/app/admin/status/page.tsx` | OK |
| /lab | Lab | `src/app/lab/page.tsx` | OK (not in nav) |
| /member/[id] | Member profile | `src/app/member/[id]/page.tsx` | OK |
| /mps/[riding-id] | MP by riding | `src/app/mps/[riding-id]/page.tsx` | OK |
| /riding/[name] | Riding page | `src/app/riding/[name]/page.tsx` | OK |
| /bills | Bills | `src/app/bills/page.tsx` | OK |

---

## 8. Dead Code

| Item | Location | Notes |
|------|----------|-------|
| **IntegrityTicker** | `src/components/IntegrityTicker.tsx` | Never imported. AppShell uses StockTicker. |

---

## 9. Server Actions

| Action | Location | Called From | Status |
|--------|----------|-------------|--------|
| `searchMembers` | `src/app/actions/members.ts` | `MembersClient` (SearchInput → onSearch) | OK |
| `listMembers` | `src/app/actions/members.ts` | `members/page.tsx`, `searchMembers` (empty query) | OK |

---

## 10. Silent Failures (Try/Catch)

Catch blocks that swallow errors without logging or user feedback:

| File | Line | Behavior | Severity |
|------|------|----------|----------|
| `src/app/api/trades/route.ts` | 86 | Returns `{ items: [] }` | Low (graceful) |
| `src/app/api/riding-activity/route.ts` | 34 | Returns `{ items: [] }` | Low |
| `src/components/GlobalSearch.tsx` | 83 | Sets `memberList=[]`, `postalResult=null` | Low |
| `src/lib/member-service.ts` | 60 | Returns `null` | Low |
| `src/components/CommandKSearchBar.tsx` | 43 | Falls through to text search | Low |
| `src/lib/api/legisinfo.ts` | 133 | (check body) | Medium |
| `src/lib/api/federal-mps.ts` | 48 | (check body) | Medium |
| `src/app/page.tsx` | 57 | (check body) | Medium |
| `src/lib/scrapers/ciecScraper.ts` | 88, 163 | (check body) | Medium |
| `src/app/api/ticker/live/route.ts` | 66 | (check body) | Medium |
| `src/app/api/bills/route.ts` | 15 | (check body) | Medium |
| `src/app/api/members/route.ts` | 37 | (check body) | Medium |
| `src/app/api/geojson/*` | 55, 36 | (check body) | Medium |
| `src/lib/api/geo.ts` | 82 | Returns null | Low |
| `src/lib/api/stocks.ts` | 67 | (check body) | Medium |
| `src/lib/api/ontario-mpps.ts` | 57 | (check body) | Medium |
| `src/components/WaitlistForm.tsx` | 20 | (check body) | Medium |
| `src/lib/admin-health.ts` | 29 | (check body) | Medium |

**Recommendation:** Add `console.error` or logger in critical paths (API routes, external fetches) for debugging; keep user-facing fallbacks.

---

## Summary

| Category | Count |
|----------|-------|
| Critical | 3 |
| Warning | 4 |
| UI/UX | 3 |
| Dead Code | 1 |
| Server Actions (all used) | 2 |
| Silent Failures (low/medium) | 18 |

**Priority fixes:**  
1. Fix StockTicker `dataUpdatedAt` (C1).  
2. Resolve or remove IntegrityTicker dead code (C2).  
3. Fix GovernanceMap map click → member lookup mismatch (C3).
