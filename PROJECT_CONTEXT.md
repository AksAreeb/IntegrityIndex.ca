# PROJECT_CONTEXT.md
# IntegrityIndex.ca | National Transparency Framework

**Last Updated:** 2026-02-01  
**Version:** 1.0.0 (Initial Comprehensive Build)

---

## 1. File Structure Map

```
src/
├── app/                          # Next.js 15 App Router (all routes live here)
│   ├── globals.css               # Global CSS: Tailwind directives + CSS custom properties
│   ├── layout.tsx                # Root layout: fonts, metadata, favicon, JurisdictionProvider
│   ├── page.tsx                  # Landing page: hero, mesh gradient, waitlist form
│   │
│   ├── api/                      # Next.js API routes for server-side data
│   │   └── geojson/
│   │       ├── federal/route.ts  # Fetches GeoJSON for federal map (Natural Earth fallback)
│   │       └── ontario/route.ts  # Fetches GeoJSON for Ontario provincial map
│   │
│   ├── bills/page.tsx            # Legislation tracking feed (placeholder)
│   ├── dashboard/page.tsx        # Interactive map dashboard with toggle (Federal/Provincial)
│   ├── explore/page.tsx          # Standalone geospatial integrity map
│   ├── lab/page.tsx              # Transparency Lab: experimental features
│   │
│   └── mps/                      # Representatives directory
│       ├── page.tsx              # Index of all MPs/MPPs (placeholder)
│       └── [riding-id]/page.tsx  # Dynamic member profile pages with Radix Tabs
│
├── components/                   # Reusable UI components
│   ├── AppShell.tsx              # Global header with 4-column nav grid + JurisdictionSwitcher
│   ├── GovernanceMap.tsx         # Interactive react-simple-maps component (memoized)
│   ├── JurisdictionSwitcher.tsx  # Toggle between FEDERAL/PROVINCIAL
│   ├── MapSkeleton.tsx           # Loading skeleton for map
│   ├── WaitlistForm.tsx          # Email waitlist input (Radix Label + HTML input)
│   │
│   ├── member-profile/           # Profile page components (Radix Tabs structure)
│   │   ├── ExecutiveSummary.tsx  # Attendance %, Integrity Score cards
│   │   ├── FinancialLedger.tsx   # Asset table with industry tags
│   │   ├── LegislativeHistory.tsx# Vertical timeline of voting record
│   │   ├── InfluenceMap.tsx      # Recharts bar chart (asset distribution by sector)
│   │   └── MemberProfileTabs.tsx # Radix Tabs wrapper for 4 profile views
│   │
│   └── experimental/             # Transparency Lab features
│       ├── BillSimplifier.tsx    # Plain-language bill summaries (public vs corporate)
│       ├── LobbyistHeatmap.tsx   # Top 10 industries meeting with government (Recharts)
│       └── WealthTimeline.tsx    # Net worth trajectory slider (Radix Slider)
│
├── contexts/                     # Client-side React Context
│   └── JurisdictionContext.tsx   # Global FEDERAL/PROVINCIAL state + primary accent color
│
├── lib/                          # Data layer and utilities
│   ├── mock-data.ts              # Comprehensive mock data for all views (Federal + Provincial)
│   └── riding-data.ts            # Mock RidingInfo for map tooltips
│
└── types/                        # TypeScript type declarations
    └── react-simple-maps.d.ts    # Custom types for react-simple-maps module
```

---

## 2. Database & Data Schema

**Current State:** The application uses a **mock data layer** (`src/lib/mock-data.ts`) with no database connection. All data is generated via TypeScript functions for development and layout testing.

### Primary Interfaces

#### `Jurisdiction`

```typescript
type Jurisdiction = "FEDERAL" | "PROVINCIAL";
```

**Purpose:** Distinguishes between federal MPs and provincial representatives (currently Ontario MPPs).

---

#### `MemberProfile`

```typescript
interface MemberProfile {
  id: string;
  name: string;
  riding: string;
  jurisdiction: Jurisdiction;
  party: string;
  executiveSummary: {
    attendancePercent: number;
    integrityScore: number;
  };
  assets: Asset[];
  legislativeHistory: VoteRecord[];
  industryDistribution: IndustryShare[];
  preOfficeAssets: Asset[];
}
```

**Purpose:** Complete profile data for a Member of Parliament or Provincial Representative.  
**Key Fields:**
- `executiveSummary`: High-level metrics (Attendance %, Integrity Score 0-100)
- `assets`: Current financial holdings
- `legislativeHistory`: Voting record on bills
- `industryDistribution`: Asset concentration by sector (for Recharts bar chart)
- `preOfficeAssets`: Historical assets for wealth trajectory comparison

**Generated via:** `getMemberProfile(ridingId: string)` in `src/lib/mock-data.ts`

---

#### `Asset`

```typescript
interface Asset {
  id: string;
  type: "Stocks" | "Real Estate" | "Trusts" | "Other";
  description: string;
  industryTags: string[];
  estimatedValue?: string;
  disclosureDate: string;
}
```

**Purpose:** Represents a single financial asset (stock, property, trust).  
**Used in:** Financial Ledger table and Wealth Timeline slider.

---

#### `VoteRecord`

```typescript
interface VoteRecord {
  id: string;
  billId: string;
  billTitle: string;
  vote: "Yea" | "Nay" | "Abstained";
  date: string;
  outcome: string;
}
```

**Purpose:** Tracks legislative votes on specific bills.  
**Used in:** Legislative History vertical timeline.

---

#### `Bill` (Sample References)

```typescript
const FEDERAL_BILLS = [
  { id: "C-11", title: "Online Streaming Act" },
  { id: "C-18", title: "Online News Act" },
  { id: "C-21", title: "An Act to amend certain Acts..." },
  { id: "C-27", title: "Digital Charter Implementation Act" },
  { id: "S-5", title: "Strengthening Environmental Protection..." },
];

const ONTARIO_BILLS = [
  { id: "Bill 23", title: "More Homes Built Faster Act" },
  { id: "Bill 124", title: "Protecting a Sustainable Public Sector..." },
  { id: "Bill 148", title: "Fair Workplaces, Better Jobs Act" },
  { id: "Bill 97", title: "Helping Homebuyers, Protecting Tenants Act" },
];
```

**Purpose:** Realistic bill references for vote records.

---

#### `IndustryShare`

```typescript
interface IndustryShare {
  sector: string;
  percentage: number;
  value: number;
}
```

**Purpose:** Used for Correlation Chart (Influence Map) bar chart visualization.

---

#### `BillSummary`

```typescript
interface BillSummary {
  billId: string;
  title: string;
  plainLanguage: string;
  publicInterestPoints: string[];
  corporateInterestPoints: string[];
}
```

**Purpose:** Plain-language bill summaries for the Bill Simplifier feature.  
**Sample data:** Includes C-11 (Online Streaming Act) and Bill 23 (More Homes Built Faster Act).

---

## 3. Component Registry

### Core UI Components (`src/components/`)

| Component | Purpose | Notable Features |
|-----------|---------|------------------|
| **AppShell** | Global layout wrapper with header + 4-column nav | Links: Representatives, Integrity Map, Legislation, Transparency Lab |
| **GovernanceMap** | Interactive Canada map (react-simple-maps) | Hover tooltips, click navigation, React.memo optimization |
| **JurisdictionSwitcher** | Toggle FEDERAL/PROVINCIAL | Updates CSS `--primary-accent` via context |
| **MapSkeleton** | Loading state for map | Spinner + "Loading map data..." text |
| **WaitlistForm** | Email input for landing page | Radix Label + HTML input, high-contrast styling |

---

### Member Profile Components (`src/components/member-profile/`)

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| **MemberProfileTabs** | Radix Tabs wrapper | Props: `profile` |
| **ExecutiveSummary** | Attendance % + Integrity Score cards | `profile.executiveSummary` |
| **FinancialLedger** | Asset table with industry tags | `profile.assets` |
| **LegislativeHistory** | Vertical timeline of votes | `profile.legislativeHistory` |
| **InfluenceMap** | Recharts bar chart (asset distribution) | `profile.industryDistribution` |

**Tab Labels:**
1. Audit Summary
2. Financial Ledger
3. Voting Record
4. Correlation Chart

---

### Experimental Components (`src/components/experimental/`)

| Component | Purpose | Technology |
|-----------|---------|-----------|
| **LobbyistHeatmap** | Top 10 industries meeting with government | Recharts vertical bar chart + "View as Table" toggle |
| **WealthTimeline** | Pre-office vs Current Assets slider | Radix Slider + table view |
| **BillSimplifier** | Plain-language bill summaries | Select dropdown + structured breakdown |

All experimental components include:
- Full WCAG 2.1 AA compliance
- ARIA labels and roles
- "View as Table" accessibility toggle (where applicable)

---

## 4. State & Routing Logic

### JurisdictionContext (`src/contexts/JurisdictionContext.tsx`)

**Purpose:** Global client-side state for toggling between Federal and Provincial modes.

**State Shape:**
```typescript
interface JurisdictionContextValue {
  jurisdiction: Jurisdiction;           // "FEDERAL" | "PROVINCIAL"
  setJurisdiction: (j: Jurisdiction) => void;
  primaryColor: string;                 // "#0F172A" (Federal) or "#475569" (Provincial)
}
```

**Usage:**
```typescript
const { jurisdiction, setJurisdiction, primaryColor } = useJurisdiction();
```

**Provider Location:** Wraps all children in `src/app/layout.tsx`.

**CSS Integration:**
- CSS custom property `--primary-accent` updates via `data-jurisdiction` attribute on root elements
- Federal: `#0F172A` (Midnight Navy)
- Provincial: `#334155` (Deep Slate)

**Note:** The current implementation uses a different color scheme in `JurisdictionContext.tsx` (`#475569`) than the CSS globals (`#334155`). This should be aligned for consistency.

---

### Active Routes (`src/app/`)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Static | Landing page (hero, mission tiles, waitlist) |
| `/dashboard` | Client | Interactive map + leaderboard grid |
| `/explore` | Client | Standalone geospatial map with Federal/Provincial toggle |
| `/mps` | Static | Representatives directory index (placeholder) |
| `/mps/[riding-id]` | Dynamic (SSR) | Individual member profile with Radix Tabs |
| `/bills` | Static | Legislation tracking feed (placeholder) |
| `/lab` | Static | Transparency Lab experimental features |
| `/api/geojson/federal` | API | Server-side GeoJSON fetch for federal map |
| `/api/geojson/ontario` | API | Server-side GeoJSON fetch for Ontario map |

**Routing System:** Next.js 15 App Router (all routes inside `src/app/`)

**Navigation Structure:**
- **Landing Page** (`/`) → Links to `/dashboard`
- **AppShell Header** (4-column grid):
  1. Representatives → `/mps`
  2. Integrity Map → `/explore`
  3. Legislation → `/bills`
  4. Transparency Lab → `/lab`
- **Map Click** → `router.push("/mps/[riding-id]")`

---

## 5. Missing Links & Errors

### Code Quality Audit Results

✅ **No TODOs or FIXMEs found** in the codebase (verified via `grep -i "TODO|FIXME"`).

✅ **No broken imports detected** (60 import statements verified across 24 files).

✅ **Build Status:** Successful compilation (11 routes generated, 0 linter errors).

---

### Favicon & Metadata Configuration

**Status:** ✅ **Properly Configured**

**File:** `src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: "IntegrityIndex.ca: National Transparency Framework",
  description:
    "Digitizing the connection between financial disclosures and legislative outcomes in Canada. National standard for parliamentary accountability.",
  icons: {
    icon: "/logo.png",
  },
};
```

**Favicon Location:** `public/logo.png` (verified to exist)

**Viewport Configuration:**
```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
```

**Fonts:**
- **IBM Plex Serif** (`--font-ibm-plex-serif`): Headlines, data-heavy titles
- **Inter** (`--font-inter`): Navigation, UI elements

---

### Known Limitations & Placeholders

1. **Mock Data Only:** All views use `src/lib/mock-data.ts`. Real data integration pending 44th Parliament Audit.

2. **GeoJSON Fallback:** API routes use Natural Earth data as a fallback. Actual Open Canada electoral district GeoJSON (dataset `a73a3013-1527-4107-924d-a96b064c7fa4`) requires authentication/conversion.

3. **Provincial Scope:** Currently limited to Ontario. Other provinces will require additional GeoJSON sources.

4. **Leaderboard Placeholders:** Dashboard leaderboard grids ("Governance Leaders", "Vested Interest Profiles") use hardcoded mock arrays.

5. **Color Inconsistency:** `JurisdictionContext.tsx` uses `#475569` for Provincial accent, but CSS globals and design spec call for `#334155`. This should be standardized.

---

## 6. Design System Summary

### Typography
- **Headlines/Data:** `font-serif` → IBM Plex Serif (400, 500, 600, 700)
- **Navigation/UI:** `font-sans` → Inter

### Color Palette
- **Background:** `#FFFFFF` (High-trust white)
- **Text Primary:** `#0F172A` (Deep navy)
- **Text Secondary:** `#64748B` (Slate)
- **Borders:** `#E2E8F0` (1px solid)
- **Federal Accent:** `#0F172A` (Midnight Navy)
- **Provincial Accent:** `#334155` (Deep Slate)

### Constraints
- **Border Radius:** 0px or 4px maximum (no rounded corners)
- **No Gradients** (except animated mesh gradient on landing page background)
- **No Emojis**
- **No Text Gradients**

### Accessibility
- **WCAG 2.1 AA Compliance:** All interactive elements
- **ARIA Labels:** Comprehensive coverage on charts, tabs, navigation
- **Screen Reader Support:** `sr-only` utility classes, "View as Table" toggles
- **Focus States:** Ring-2 focus indicators on interactive elements

---

## 7. Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js | 15.1.0+ |
| **Language** | TypeScript | ^5 |
| **Styling** | Tailwind CSS | ^3.4.17 |
| **UI Primitives** | Radix UI | Tabs, Slider, Label |
| **Charts** | Recharts | ^2.15.0 |
| **Maps** | react-simple-maps | ^3.0.0 |
| **Fonts** | Google Fonts | next/font (IBM Plex Serif, Inter) |
| **Linting** | ESLint | ^9 (next/core-web-vitals) |
| **Runtime** | React | ^18.3.1 |

---

## 8. Build & Deployment

### Development
```bash
npm run dev          # Start dev server on localhost:3000
```

### Production
```bash
npm run build        # Generate optimized production build
npm run start        # Start production server
```

### Build Output (Latest)
- **Total Routes:** 11 (8 static, 3 dynamic/API)
- **First Load JS:** 102-215 kB (optimized)
- **Status:** ✅ Build successful (0 errors, 0 warnings)

---

## 9. Next Steps & Roadmap

### Immediate Priorities
1. **Standardize Colors:** Align `JurisdictionContext` Provincial color with CSS globals (`#334155`).
2. **Populate `/mps` Index:** Replace placeholder with actual member directory grid.
3. **Real GeoJSON Integration:** Obtain Open Canada API credentials for electoral district boundaries.

### Future Enhancements
1. **Database Integration:** Replace mock data with Prisma/Drizzle + PostgreSQL.
2. **ETL Pipeline:** Automate CIEC disclosure parsing and LEGISinfo ingestion.
3. **Correlation Engine:** Implement statistical analysis for asset-vote patterns.
4. **Multi-Provincial Support:** Expand beyond Ontario to all provinces/territories.
5. **Search & Filtering:** Add member search, bill tracking filters.
6. **Authentication:** User accounts for saved searches and watchlists.

---

## 10. File Count & Line Statistics

**Total Files (src/):** 31 files  
**Total Import Statements:** 60 across 24 files  
**Primary Data Source:** `src/lib/mock-data.ts` (233 lines)  
**Largest Component:** `src/app/page.tsx` (118 lines)

---

**End of Project Context Document**  
*For questions or updates, reference this file using `@PROJECT_CONTEXT.md` in future prompts.*
