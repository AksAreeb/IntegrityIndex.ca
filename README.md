# IntegrityIndex.ca | Transparent, Accessible and Free

IntegrityIndex.ca is a non-partisan, open-source data infrastructure designed to enhance democratic accountability in Canada. The platform provides a correlation engine between the financial disclosures of Members of Parliament and their legislative voting records.

## Mission Objective
Provide every Canadian with crucial information on who actually represents them. Does your elected official campaign on a specific cause but financially benefit from the opposite?

---

## Core Systems Architecture

The platform operates through three primary data pipelines:

1. **Disclosure Extraction (ETL):** Automated parsing of the Office of the Conflict of Interest and Ethics Commissioner’s public registries.
2. **Legislative Categorization:** Real-time ingestion of LEGISinfo data feeds, categorized by industrial and economic impact.
3. **Correlation Engine:** A non-partisan algorithm that identifies statistical overlaps between personal financial assets and departmental voting outcomes.

---

## Governance & Methodology

IntegrityIndex.ca adheres to the following core principles:

* **Neutrality:** The system utilizes a unified algorithmic approach for all Members of Parliament, regardless of political affiliation.
* **Data Provenance:** Every data point is directly mapped to a primary source (Open Government Portal, CIEC, or Hansard).
* **Open Science:** The underlying methodology and source code are public to ensure community verification and reproducibility.

---

## Technical Stack

* **Language:** Python 3.11 (Data Parsing & Analysis)
* **Framework:** Next.js 15 (Infrastructure & Frontend)
* **Database:** PostgreSQL (Structured Governance Data)
* **Infrastructure:** Vercel (Edge Deployment)

---

### Prerequisites
* Python 3.11+
* Node.js 20+

### Security
To report a vulnerability or data discrepancy, please refer to the `SECURITY.md`.

## License
Distributed under the MIT License. See `LICENSE` for more information.

---
© 2026 IntegrityIndex.ca | Facilitating a more transparent Canada.