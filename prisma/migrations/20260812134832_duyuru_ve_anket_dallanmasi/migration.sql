-- AlterTable
ALTER TABLE "category_templates" ADD COLUMN "problemOptions" TEXT;

-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN "problemDetails" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_businesses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "googleReviewUrl" TEXT,
    "notifyThreshold" INTEGER NOT NULL DEFAULT 3,
    "googleRedirect" BOOLEAN NOT NULL DEFAULT true,
    "brandColor" TEXT NOT NULL DEFAULT '#111827',
    "qrCardText" TEXT,
    "iysBrandCode" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "instagramUrl" TEXT,
    "announcement" TEXT,
    "announcementActive" BOOLEAN NOT NULL DEFAULT false,
    "wifiSsid" TEXT,
    "wifiPassword" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "businesses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_businesses" ("accountId", "address", "brandColor", "coverUrl", "createdAt", "googleRedirect", "googleReviewUrl", "id", "instagramUrl", "iysBrandCode", "logoUrl", "name", "notifyThreshold", "qrCardText", "slug", "type", "wifiPassword", "wifiSsid") SELECT "accountId", "address", "brandColor", "coverUrl", "createdAt", "googleRedirect", "googleReviewUrl", "id", "instagramUrl", "iysBrandCode", "logoUrl", "name", "notifyThreshold", "qrCardText", "slug", "type", "wifiPassword", "wifiSsid" FROM "businesses";
DROP TABLE "businesses";
ALTER TABLE "new_businesses" RENAME TO "businesses";
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");
CREATE INDEX "businesses_accountId_idx" ON "businesses"("accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
