# Supabase Configuration Audit

**Stack:** Next.js (App Router), Prisma 7.3.0, Supabase (PostgreSQL 17).

---

## 1. Schema verification

From `prisma/schema.prisma`:

| Feature | In schema? | Manual Supabase action? |
|--------|------------|--------------------------|
| **PostgreSQL extensions** | No `@@schema` extensions in Prisma | Yes – enable `pg_trgm` in SQL Editor for fuzzy search. |
| **Row Level Security (RLS)** | Not defined in Prisma | Yes – enable RLS and add policies so public can read, only `service_role` can write. |
| **Unique index on `Member.officialId`** | `officialId String? @unique` | Prisma migration creates it. Optional: verify or add via SQL below. |
| **Expression index** | Comment on `Member` references “expression index” – no `@@index` in current schema | None unless you add an expression index later; then see [Prisma expression indexes](https://pris.ly/d/expression-indexes). |
| **Types** | Standard Prisma types (String, Int, DateTime, Boolean) | No custom PostgreSQL types required. |

**Conclusion:** No Prisma features in the current schema require custom PostgreSQL types or extensions beyond what migrations create. Manual steps: enable `pg_trgm` and configure RLS (see SQL below).

---

## 2. SQL to run in Supabase SQL Editor

Run these in order in the **Supabase Dashboard → SQL Editor**. Replace `public` with your schema if different.

### 2.1 Enable `pg_trgm` (fuzzy name search)

```sql
-- Enable pg_trgm for similarity / fuzzy search (e.g. member name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2.2 Row Level Security (RLS)

Public (anon) can **read** all tables; only **service_role** (your backend/seed) can **write**.

```sql
-- Enable RLS on all app tables
ALTER TABLE "Member"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Disclosure"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeTicker"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppStatus"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockPriceCache" ENABLE ROW LEVEL SECURITY;

-- Public read: allow anon and authenticated to SELECT
CREATE POLICY "Public read Member"
  ON "Member" FOR SELECT USING (true);

CREATE POLICY "Public read Disclosure"
  ON "Disclosure" FOR SELECT USING (true);

CREATE POLICY "Public read TradeTicker"
  ON "TradeTicker" FOR SELECT USING (true);

CREATE POLICY "Public read Bill"
  ON "Bill" FOR SELECT USING (true);

CREATE POLICY "Public read AppStatus"
  ON "AppStatus" FOR SELECT USING (true);

CREATE POLICY "Public read StockPriceCache"
  ON "StockPriceCache" FOR SELECT USING (true);

-- Write: only service_role (backend/seed use this key; it bypasses RLS by default in Supabase).
-- If you use anon/authenticated for the app and want to restrict writes to a backend role only,
-- create a role that uses service_role key and add policies like:
-- CREATE POLICY "Service role full access Member"
--   ON "Member" FOR ALL USING (current_setting('role') = 'service_role');
-- In practice, Supabase service_role key bypasses RLS, so the above SELECT-only policies
-- mean: anon/authenticated can only read; writes from your app (using service_role key) succeed.
```

**Note:** With Supabase, the **service_role** key bypasses RLS. So as long as your seed and backend use the **service_role** key (or a role that bypasses RLS), they can write. The policies above ensure that **anon** and **authenticated** (e.g. browser with anon key) can only **SELECT**.

### 2.3 Ensure `officialId` unique index

Prisma migrations should already create a unique constraint/index on `Member.officialId`. To ensure it exists or recreate it:

```sql
-- Ensure unique index on Member.officialId (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Member_officialId_key"
  ON "Member" ("officialId")
  WHERE "officialId" IS NOT NULL;
```

---

## 3. Summary checklist

- [ ] Run `npx prisma generate` so the client (including `officialId` on `Member`) is up to date.
- [ ] Run migrations: `npx prisma migrate deploy` (or `migrate dev` locally).
- [ ] In Supabase SQL Editor: run `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- [ ] In Supabase SQL Editor: run the RLS `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements.
- [ ] In Supabase SQL Editor: run `CREATE UNIQUE INDEX IF NOT EXISTS "Member_officialId_key" ...` if you want to enforce it manually or verify it.

After this, the seed can use the Prisma singleton and upsert members by `officialId` without breaking your existing setup.
