-- Run this in Supabase SQL Editor (Dashboard → SQL Editor).
-- 1) Enable pg_trgm for fuzzy name search
-- 2) Enable RLS and allow public read, service_role write
-- 3) Ensure Member.officialId unique index

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- RLS: enable on all tables
ALTER TABLE "Member"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Disclosure"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeTicker"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppStatus"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockPriceCache" ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated can SELECT only)
CREATE POLICY "Public read Member"          ON "Member"          FOR SELECT USING (true);
CREATE POLICY "Public read Disclosure"      ON "Disclosure"      FOR SELECT USING (true);
CREATE POLICY "Public read TradeTicker"    ON "TradeTicker"     FOR SELECT USING (true);
CREATE POLICY "Public read Bill"            ON "Bill"            FOR SELECT USING (true);
CREATE POLICY "Public read AppStatus"      ON "AppStatus"       FOR SELECT USING (true);
CREATE POLICY "Public read StockPriceCache" ON "StockPriceCache" FOR SELECT USING (true);

-- officialId unique index (idempotent; Prisma may have already created it)
CREATE UNIQUE INDEX IF NOT EXISTS "Member_officialId_key"
  ON "Member" ("officialId")
  WHERE "officialId" IS NOT NULL;
