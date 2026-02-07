-- AlterTable
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "openParlId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Member_openParlId_idx" ON "Member"("openParlId");
