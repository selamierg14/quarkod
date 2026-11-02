
-- CreateTable
CREATE TABLE "app_etkinlikler" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "iptalEdildi" TIMESTAMP(3),
    "kaldirildi" TIMESTAMP(3),
    "kaldirmaSebebi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_etkinlikler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_etkinlik_ilgileri" (
    "id" TEXT NOT NULL,
    "appEtkinlikId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_etkinlik_ilgileri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_etkinlikler_baslangic_idx" ON "app_etkinlikler"("baslangic");

-- CreateIndex
CREATE INDEX "app_etkinlikler_businessId_baslangic_idx" ON "app_etkinlikler"("businessId", "baslangic");

-- CreateIndex
CREATE INDEX "app_etkinlikler_appUserId_idx" ON "app_etkinlikler"("appUserId");

-- CreateIndex
CREATE INDEX "app_etkinlik_ilgileri_appUserId_idx" ON "app_etkinlik_ilgileri"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "app_etkinlik_ilgileri_appEtkinlikId_appUserId_key" ON "app_etkinlik_ilgileri"("appEtkinlikId", "appUserId");

-- AddForeignKey
ALTER TABLE "app_etkinlikler" ADD CONSTRAINT "app_etkinlikler_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_etkinlikler" ADD CONSTRAINT "app_etkinlikler_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_etkinlik_ilgileri" ADD CONSTRAINT "app_etkinlik_ilgileri_appEtkinlikId_fkey" FOREIGN KEY ("appEtkinlikId") REFERENCES "app_etkinlikler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_etkinlik_ilgileri" ADD CONSTRAINT "app_etkinlik_ilgileri_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

