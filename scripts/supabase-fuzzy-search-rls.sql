-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- 1) Enable pg_trgm for fuzzy search (trigram similarity)
-- 2) Create GIN indexes on Member.name and Member.riding
-- 3) RLS: Public SELECT for anon; ALL for service_role

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GIN indexes for fuzzy search (name, riding)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Member_name_gin_trgm" ON "Member" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Member_riding_gin_trgm" ON "Member" USING gin ("riding" gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security (RLS) on all tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS
ALTER TABLE "Member"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Disclosure"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeTicker"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppStatus"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockPriceCache" ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policies if present (idempotent via IF EXISTS is not supported; use DO block or manual drop)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read Member"          ON "Member";
  DROP POLICY IF EXISTS "Public read Disclosure"      ON "Disclosure";
  DROP POLICY IF EXISTS "Public read TradeTicker"     ON "TradeTicker";
  DROP POLICY IF EXISTS "Public read Bill"            ON "Bill";
  DROP POLICY IF EXISTS "Public read AppStatus"       ON "AppStatus";
  DROP POLICY IF EXISTS "Public read StockPriceCache" ON "StockPriceCache";
END $$;

-- anon: Public SELECT only (read access for unauthenticated users)
CREATE POLICY "anon_select_Member"          ON "Member"          FOR SELECT TO anon          USING (true);
CREATE POLICY "anon_select_Disclosure"      ON "Disclosure"      FOR SELECT TO anon          USING (true);
CREATE POLICY "anon_select_TradeTicker"     ON "TradeTicker"     FOR SELECT TO anon          USING (true);
CREATE POLICY "anon_select_Bill"            ON "Bill"            FOR SELECT TO anon          USING (true);
CREATE POLICY "anon_select_AppStatus"       ON "AppStatus"       FOR SELECT TO anon          USING (true);
CREATE POLICY "anon_select_StockPriceCache" ON "StockPriceCache" FOR SELECT TO anon          USING (true);

-- authenticated: same read access as anon
CREATE POLICY "auth_select_Member"          ON "Member"          FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_select_Disclosure"      ON "Disclosure"      FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_select_TradeTicker"     ON "TradeTicker"     FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_select_Bill"            ON "Bill"            FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_select_AppStatus"       ON "AppStatus"       FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_select_StockPriceCache" ON "StockPriceCache" FOR SELECT TO authenticated  USING (true);

-- service_role: full access (SELECT, INSERT, UPDATE, DELETE)
-- Note: In Supabase, service_role typically bypasses RLS; these policies document intent and ensure compatibility.
CREATE POLICY "service_role_all_Member"          ON "Member"          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_Disclosure"      ON "Disclosure"      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_TradeTicker"     ON "TradeTicker"     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_Bill"            ON "Bill"            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_AppStatus"       ON "AppStatus"       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_StockPriceCache" ON "StockPriceCache" FOR ALL TO service_role USING (true) WITH CHECK (true);
