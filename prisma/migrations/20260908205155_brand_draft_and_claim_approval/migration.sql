-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pendingDelete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BrandDraft" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "purpose" TEXT,
    "persona" TEXT,
    "voiceRules" TEXT,
    "monicaRules" TEXT,
    "ctaRules" TEXT,
    "allowedVocab" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bannedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disclaimers" TEXT,
    "colorPrimary" TEXT,
    "colorSecondary" TEXT,
    "colorBackground" TEXT,
    "colorAccent" TEXT,
    "colorText" TEXT,
    "fontDisplay" TEXT,
    "fontBody" TEXT,
    "imageRules" TEXT,
    "proposedBy" TEXT,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandDraft_pkey" PRIMARY KEY ("id")
);
