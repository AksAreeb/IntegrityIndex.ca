# IntegrityIndex.ca | Scoring Logic (v1.0)

The Integrity Score is a 0-100 numerical rating assessing the risk for Canadian Parliamentarians.

### The Base Score: 100
Every member starts with a perfect score. Points are deducted based on risk behaviors:

1. **Trade Volume (TV):** -5 points per individual stock trade (BUY/SELL) in the last 12 months. (Max deduction: 30)
2. **Sector Conflict (SC):** -15 points if a member sits on a Committee (e.g., Natural Resources) while holding stocks in that sector (e.g., Enbridge).
3. **Late Filings (LF):** -1 point for every 10 days a disclosure is filed past the 30-day legal grace period.
4. **Legislative Proximity (LP):** -20 points if a member sponsors a bill that directly impacts a sector where they hold >$10k in assets.

**Final Formula:** `Score = 100 - (TV + SC + LF + LP)`

This is just the first version, also made by a university student without a math degree..