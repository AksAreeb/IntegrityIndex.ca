-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM ('FEDERAL', 'PROVINCIAL');

-- AlterTable Member: add slug, convert jurisdiction to enum
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Member_slug_key" ON "Member"("slug") WHERE "slug" IS NOT NULL;
ALTER TABLE "Member" ALTER COLUMN "jurisdiction" TYPE "Jurisdiction" USING "jurisdiction"::"Jurisdiction";
CREATE INDEX IF NOT EXISTS "Member_jurisdiction_idx" ON "Member"("jurisdiction");
CREATE INDEX IF NOT EXISTS "Member_slug_idx" ON "Member"("slug");

-- CreateTable Sector
CREATE TABLE IF NOT EXISTS "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Sector_name_key" ON "Sector"("name");

-- CreateTable AssetSectorMapping
CREATE TABLE IF NOT EXISTS "AssetSectorMapping" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,

    CONSTRAINT "AssetSectorMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AssetSectorMapping_keyword_key" ON "AssetSectorMapping"("keyword");
CREATE INDEX IF NOT EXISTS "AssetSectorMapping_sectorId_idx" ON "AssetSectorMapping"("sectorId");

-- CreateTable Committee
CREATE TABLE IF NOT EXISTS "Committee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Committee_name_key" ON "Committee"("name");

-- CreateTable CommitteeSector
CREATE TABLE IF NOT EXISTS "CommitteeSector" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,

    CONSTRAINT "CommitteeSector_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommitteeSector_committeeId_sectorId_key" ON "CommitteeSector"("committeeId", "sectorId");
CREATE INDEX IF NOT EXISTS "CommitteeSector_committeeId_idx" ON "CommitteeSector"("committeeId");
CREATE INDEX IF NOT EXISTS "CommitteeSector_sectorId_idx" ON "CommitteeSector"("sectorId");

-- CreateTable MemberCommittee
CREATE TABLE IF NOT EXISTS "MemberCommittee" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,

    CONSTRAINT "MemberCommittee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MemberCommittee_memberId_committeeId_key" ON "MemberCommittee"("memberId", "committeeId");
CREATE INDEX IF NOT EXISTS "MemberCommittee_memberId_idx" ON "MemberCommittee"("memberId");
CREATE INDEX IF NOT EXISTS "MemberCommittee_committeeId_idx" ON "MemberCommittee"("committeeId");

-- CreateTable Riding
CREATE TABLE IF NOT EXISTS "Riding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "externalId" TEXT,

    CONSTRAINT "Riding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Riding_slug_key" ON "Riding"("slug");
CREATE INDEX IF NOT EXISTS "Riding_slug_idx" ON "Riding"("slug");
CREATE INDEX IF NOT EXISTS "Riding_jurisdiction_idx" ON "Riding"("jurisdiction");

-- AlterTable Disclosure: add sectorId
ALTER TABLE "Disclosure" ADD COLUMN IF NOT EXISTS "sectorId" TEXT;
CREATE INDEX IF NOT EXISTS "Disclosure_sectorId_idx" ON "Disclosure"("sectorId");

-- AddForeignKey AssetSectorMapping
ALTER TABLE "AssetSectorMapping" ADD CONSTRAINT "AssetSectorMapping_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey CommitteeSector
ALTER TABLE "CommitteeSector" ADD CONSTRAINT "CommitteeSector_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommitteeSector" ADD CONSTRAINT "CommitteeSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey MemberCommittee
ALTER TABLE "MemberCommittee" ADD CONSTRAINT "MemberCommittee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberCommittee" ADD CONSTRAINT "MemberCommittee_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Disclosure.sectorId
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
