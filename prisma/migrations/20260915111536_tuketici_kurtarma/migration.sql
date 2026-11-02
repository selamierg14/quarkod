-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "telefon" TEXT,
ADD COLUMN     "telefonDogrulandi" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "app_otp_codes" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "phone" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_otp_codes_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "app_otp_codes_appUserId_purpose_createdAt_idx" ON "app_otp_codes"("appUserId", "purpose", "createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "app_users_telefon_key" ON "app_users"("telefon");
-- AddForeignKey
ALTER TABLE "app_otp_codes" ADD CONSTRAINT "app_otp_codes_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
