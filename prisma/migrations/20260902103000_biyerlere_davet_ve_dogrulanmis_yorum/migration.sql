-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "referralCode" TEXT NOT NULL,
ADD COLUMN     "referredById" TEXT;

-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "appUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "app_users_referralCode_key" ON "app_users"("referralCode");

-- CreateIndex
CREATE INDEX "feedbacks_businessId_appUserId_idx" ON "feedbacks"("businessId", "appUserId");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
