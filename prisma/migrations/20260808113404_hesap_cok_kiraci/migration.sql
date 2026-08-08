-- Çok kiracılı yapıya geçiş.
--
-- Mevcut veri tek bir patrona ait olduğu için hepsi tek bir hesaba taşınıyor.
-- Prisma'nın ürettiği SQL boş olmayan tabloya zorunlu sütun ekleyemediğinden
-- INSERT adımları elle eklendi; veri kaybı yok.

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'standart',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Mevcut işletmelerin taşınacağı hesap.
INSERT INTO "accounts" ("id", "name", "email", "active", "plan", "createdAt")
VALUES ('acct_varsayilan', 'Varsayılan Hesap', NULL, true, 'standart', CURRENT_TIMESTAMP);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "businesses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_businesses" ("accountId", "address", "brandColor", "createdAt", "googleRedirect", "googleReviewUrl", "id", "name", "notifyThreshold", "qrCardText", "slug", "type")
SELECT 'acct_varsayilan', "address", "brandColor", "createdAt", "googleRedirect", "googleReviewUrl", "id", "name", "notifyThreshold", "qrCardText", "slug", "type" FROM "businesses";
DROP TABLE "businesses";
ALTER TABLE "new_businesses" RENAME TO "businesses";
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");
CREATE INDEX "businesses_accountId_idx" ON "businesses"("accountId");

CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "businessId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "users_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Mevcut kullanıcıların hepsi bu hesabın kullanıcısı olur; platform yöneticisi
-- (superadmin) sonradan seed ile eklenir ve accountId'si null kalır.
INSERT INTO "new_users" ("accountId", "active", "businessId", "createdAt", "email", "id", "name", "passwordHash", "role")
SELECT 'acct_varsayilan', "active", "businessId", "createdAt", "email", "id", "name", "passwordHash", "role" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_accountId_idx" ON "users"("accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
