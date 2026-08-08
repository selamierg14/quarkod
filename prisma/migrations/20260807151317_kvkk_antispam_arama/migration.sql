-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN "commentSearch" TEXT;
ALTER TABLE "feedbacks" ADD COLUMN "consentAt" DATETIME;
ALTER TABLE "feedbacks" ADD COLUMN "consentVersion" TEXT;
ALTER TABLE "feedbacks" ADD COLUMN "contactErasedAt" DATETIME;
ALTER TABLE "feedbacks" ADD COLUMN "contactType" TEXT;
ALTER TABLE "feedbacks" ADD COLUMN "visitorId" TEXT;

-- CreateIndex
CREATE INDEX "feedbacks_visitorId_tableId_createdAt_idx" ON "feedbacks"("visitorId", "tableId", "createdAt");

-- CreateIndex
CREATE INDEX "feedbacks_ipHash_businessId_createdAt_idx" ON "feedbacks"("ipHash", "businessId", "createdAt");
