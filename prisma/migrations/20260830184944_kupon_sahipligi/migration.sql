-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "appUserId" TEXT,
ADD COLUMN     "usedAt" TIMESTAMP(3),
ADD COLUMN     "usedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "coupons_appUserId_used_idx" ON "coupons"("appUserId", "used");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
