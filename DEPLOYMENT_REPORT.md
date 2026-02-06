# IntegrityIndex.ca — Pre-Deployment Audit Report

Generated as part of the final production hardening pass.

---

## Working

| Area | Status | Notes |
|------|--------|--------|
| **Routes** | OK | `/`, `/mps`, `/mps/[riding-id]`, `/member/[id]`, `/bills`, `/legislation`, `/explore`, `/analytics`, `/dashboard`, `/about`, `/lab` (redirects to `/analytics`), `/admin/status`, `/api/*` return expected status. |
| **Representatives** | OK | Directory and member profiles use Prisma. Empty roster shows sync prompt with link to `/api/sync` (ourcommons + Ontario export). No "Audit in progress" copy. |
| **Photo CDN** | OK | Federal: 45th Parliament (`OfficialMpPhotos/45/{id}.jpg`). Provincial: OLA (`mpp-photos/{slug}.jpg`). MemberPhoto + member-photos handle fallback. |
| **Legislation** | OK | `/legislation` and `/bills` use LEGISinfo 45-1 API. Analysis toggle shows System Analysis and Stakeholder Warning badge. |
| **Live Ticker** | OK | StockTicker fetches from `/api/trades` only; marquee duration 60s. |
| **Analytics** | OK | Wealth Timeline uses Disclosure table and disclosureDate; market snapshot from StockPriceCache when available. No mock profile. |
| **Formula (About)** | OK | LaTeX-style equation block with serif and subscripts. |
| **Terminology** | OK | "System Analysis" and "Member Audit" used; no AI-speak in UI. |
| **Prisma** | OK | Singleton in `db.ts`; migrations and seed documented. |

---

## Not Working / Limitations

| Item | Notes |
|------|--------|
| **Federal members export** | `https://www.ourcommons.ca/en/members/export/json` may return 404 or a different format in production. Sync step E (roster) depends on this; fallback or manual seed may be required. |
| **LEGISinfo API shape** | Response structure for `parliaments=45` may vary (Items vs items vs bills). Parser handles common shapes; if Parliament changes format, bill list may be empty. |
| **Wealth Timeline benchmark** | S&P/TSX 60 trend overlay uses StockPriceCache (current snapshot only). No historical time series, so "trend" is a market snapshot list, not a true overlay. |
| **Lobbyist Heatmap** | Still uses static mock data until a lobbyist API exists. Documented as experimental. |
| **Bill summaries** | System Analysis text comes from `getBillSummary(bill.number)` in mock-data for known bills; unknown bills get a generic line. No live LEGISinfo summary API. |
| **Member profile enrichment** | Executive summary, legislative history, industry distribution, and pre-office assets on member profile still come from mock when DB has no equivalent. |
| **IntegrityTicker fallback** | When `/api/trades` returns empty, fallback message is shown; consider aligning with StockTicker copy ("Awaiting next CIEC filing update…"). |
| **Per-page SEO** | No `generateMetadata` on key pages; all use root layout metadata. |

---

## Pre-Launch Checklist

- [ ] Run `npx prisma db seed` (or migrate) and confirm bills from LEGISinfo 45th Parliament.
- [ ] Confirm map GeoJSON URL is reachable (or fallback) from production.
- [ ] Test global search by name and by postal code (e.g. K1A 0A6).
- [ ] Test bill Analysis toggle and Stakeholder Warning on `/legislation` and `/bills`.
- [ ] Verify `DATABASE_URL` and any API keys (e.g. Finnhub) in production env.
- [ ] If roster is empty, trigger sync and confirm federal/Ontario counts (targets 343 / 124).
- [ ] Add page-level metadata for main routes if SEO is a priority.
