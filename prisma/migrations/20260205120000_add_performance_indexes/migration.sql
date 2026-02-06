-- CreateIndex
-- Optimizes recent trades list (orderBy date desc)
CREATE INDEX "TradeTicker_date_idx" ON "TradeTicker"("date" DESC);

-- CreateIndex
-- Optimizes filtering and map activity by disclosure date
CREATE INDEX "Disclosure_disclosureDate_idx" ON "Disclosure"("disclosureDate");
