# IntegrityIndex.ca | National Transparency Framework

**IntegrityIndex.ca** is a non-partisan, open-source civic-tech infrastructure designed to enhance democratic accountability in Canada. The platform provides a correlation engine between the financial disclosures of Members of Parliament and their legislative voting records.

---

## Project Overview

### Mission
Provide every Canadian with crucial information on parliamentary accountability. Does your elected official campaign on a specific cause but financially benefit from the opposite? IntegrityIndex.ca makes this data accessible, transparent, and actionable.

---

## Core Architecture

### Platform Features

1. **Representatives Directory** (`/mps`): Complete index of MPs and MPPs with individual profile pages
2. **Integrity Map** (`/explore`): Interactive geospatial view showing riding-level accountability metrics
3. **Legislation Feed** (`/bills`): Live tracking of parliamentary bills and voting patterns
4. **Transparency Lab** (`/lab`): Experimental features including:
   - Lobbyist Heatmap (Top industries meeting with government)
   - Wealth Timeline (Net-worth trajectory visualization)
   - Bill Simplifier (Plain-language summaries with public vs corporate interest analysis)

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

Each representative's profile includes:

1. **Audit Summary:** Attendance % and Integrity Score (0-100)
2. **Financial Ledger:** Detailed asset table with industry tags
3. **Voting Record:** Chronological bill history with MP stance
4. **Correlation Chart:** Visual asset distribution by sector

---

## Mock Data

All views currently use mock data from `src/lib/mock-data.ts`. Real data integration will occur when the 44th Parliament Audit is complete.

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

© 2026 IntegrityIndex.ca | Facilitating a more transparent Canada.
