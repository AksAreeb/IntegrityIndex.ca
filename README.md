# IntegrityIndex.ca | National Transparency Framework

**IntegrityIndex.ca** is a non-partisan, open-source civic-tech project for parliamentary accountability in Canada. It links financial disclosures of Members of Parliament to legislative activity and bills.

---

## Project Overview

### Mission
Give Canadians clear information on parliamentary accountability. The site shows whether an elected official’s disclosed assets overlap with bills they work on, and tracks disclosure filings and key votes.

---

## Core Architecture

### Platform Features

1. **Representatives Directory** (`/mps`): Index of federal MPs and Ontario MPPs with profile pages (photo CDN: 45th Parliament / OLA).
2. **Integrity Map** (`/explore`): Interactive map with riding-level data.
3. **Legislation** (`/bills`, `/legislation`): Bills from the 45th Parliament (LEGISinfo API). Each bill has an Analysis toggle with a System Analysis summary and Stakeholder Warning when members hold stock in the bill’s sector.
4. **Analytics** (`/analytics`): Wealth Timeline from disclosure filing dates and market snapshot from StockPriceCache; Lobbyist Heatmap (experimental).

### Data Pipelines

1. **Disclosure Extraction (ETL):** Automated parsing of the Office of the Conflict of Interest and Ethics Commissioner's public registries.
2. **Legislative Categorization:** Real-time ingestion of LEGISinfo data feeds, categorized by industrial and economic impact.
3. **Correlation Engine:** A non-partisan algorithm that identifies statistical overlaps between personal financial assets and departmental voting outcomes.

---

## Technical Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **UI Components:** Radix UI (Tabs, Slider, Label)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Maps:** react-simple-maps
- **Fonts:** IBM Plex Serif (Headlines), Inter (UI)
- **Infrastructure:** Vercel (Deployment)

---

## Design System

### Typography
- **Headlines & Data:** IBM Plex Serif
- **Navigation & UI:** Inter

### Visual Identity
- **Background:** `#FFFFFF` (High-trust white)
- **Primary Accent (Federal):** `#0F172A` (Midnight Navy)
- **Primary Accent (Provincial):** `#334155` (Deep Slate)
- **Borders:** `1px solid #E2E8F0`
- **Border Radius:** 0px or 4px maximum (institutional precision)

### Accessibility
- 100% WCAG 2.1 AA compliance
- "View as Table" toggles for all charts
- Comprehensive ARIA labels
- Screen-reader optimized

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/IntegrityIndex.ca.git
cd IntegrityIndex.ca

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database (Prisma 7 & Supabase)

The app uses **PostgreSQL** (Supabase) with Prisma 7. In `.env` set:

- `DATABASE_URL` — pooled connection (port **6543**) for the app
- `DIRECT_URL` — direct connection (port **5432**) for migrations

`prisma.config.ts` is the primary CLI config and must use `DIRECT_URL` so `prisma migrate dev` uses the direct port (avoids "Tenant Not Found" / pooler rejection).

**First-time migration (Windows PowerShell):**

```powershell
# From repo root — clear legacy Prisma artifacts
if (Test-Path "node_modules\.prisma") { Remove-Item -Recurse -Force "node_modules\.prisma" }
if (Test-Path "src\generated") { Remove-Item -Recurse -Force "src\generated" }

# Generate client and run initial migration
npx prisma generate
npx prisma migrate dev --name init_supabase
```

Or run the script:

```powershell
.\scripts\prisma-supabase-migrate.ps1
```

### Building for Production

```bash
npm run build
npm run start
```

---

## Jurisdiction System

The platform supports both **Federal** (MPs) and **Provincial** (MPPs, currently Ontario) oversight modes. Use the JurisdictionSwitcher in the top-right navigation to toggle between modes. The UI theme adapts accordingly:

- **Federal:** Deep Navy accent (`#0F172A`)
- **Provincial:** Slate accent (`#334155`)

---

## Member Profile Structure

Each representative’s profile includes:

1. **Member Audit:** Attendance and Integrity Score (0–100) from live data.
2. **Financial Disclosures:** Table of disclosed assets from the database.
3. **Conflict Warnings:** Bills that touch sectors where the member holds reported stock.

Where the database has no matching record (e.g. executive summary text, legislative history), the UI may still use fallback content from `src/lib/mock-data.ts` until those sources are wired to real data.

---

## Governance & Methodology

IntegrityIndex.ca adheres to the following core principles:

- **Neutrality:** The system utilizes a unified algorithmic approach for all Members of Parliament, regardless of political affiliation.
- **Data Provenance:** Every data point is directly mapped to a primary source (Open Government Portal, CIEC, or Hansard).
- **Open Science:** The underlying methodology and source code are public to ensure community verification and reproducibility.

---

## Contributing

Contributions are welcome. Please see `CONTRIBUTING.md` for guidelines.

### Security
To report a vulnerability or data discrepancy, please refer to `SECURITY.md`.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

© 2026 IntegrityIndex.ca
