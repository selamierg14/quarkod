-- AlterTable
ALTER TABLE "accounts" ADD COLUMN "iysCode" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "iysBrandCode" TEXT;

-- CreateTable
CREATE TABLE "marketing_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "feedbackId" TEXT,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL DEFAULT 'BIREYSEL',
    "status" TEXT NOT NULL DEFAULT 'ONAY',
    "source" TEXT NOT NULL DEFAULT 'HS_WEB',
    "consentAt" DATETIME NOT NULL,
    "textVersion" TEXT NOT NULL,
    "ipHash" TEXT,
    "reportedAt" DATETIME,
    "iysTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "marketing_consents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "marketing_consents_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "marketing_consents_businessId_reportedAt_idx" ON "marketing_consents"("businessId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_consents_businessId_channel_recipient_key" ON "marketing_consents"("businessId", "channel", "recipient");
