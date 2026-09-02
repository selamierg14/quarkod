-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "plusBitis" TIMESTAMP(3),
ADD COLUMN     "plusUyeMi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sonBilinenBoylam" DOUBLE PRECISION,
ADD COLUMN     "sonBilinenEnlem" DOUBLE PRECISION,
ADD COLUMN     "sonKonumGuncelleme" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "biyerlerePlusOrtagi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushKredisi" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sponsorHaftasi" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mekan_etkilesimleri" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mekan_etkilesimleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_favorites" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotalar" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "gorselUrl" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rotalar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_duraklari" (
    "id" TEXT NOT NULL,
    "rotaId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rota_duraklari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_tamamlamalari" (
    "id" TEXT NOT NULL,
    "rotaId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rota_tamamlamalari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_push_subscriptions" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "disabledAt" TIMESTAMP(3),
    "disabledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mekan_etkilesimleri_businessId_tur_createdAt_idx" ON "mekan_etkilesimleri"("businessId", "tur", "createdAt");

-- CreateIndex
CREATE INDEX "app_favorites_businessId_idx" ON "app_favorites"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "app_favorites_appUserId_businessId_key" ON "app_favorites"("appUserId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "rotalar_slug_key" ON "rotalar"("slug");

-- CreateIndex
CREATE INDEX "rota_duraklari_businessId_idx" ON "rota_duraklari"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "rota_duraklari_rotaId_businessId_key" ON "rota_duraklari"("rotaId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "rota_tamamlamalari_rotaId_appUserId_key" ON "rota_tamamlamalari"("rotaId", "appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "app_push_subscriptions_endpoint_key" ON "app_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "app_push_subscriptions_appUserId_idx" ON "app_push_subscriptions"("appUserId");

-- AddForeignKey
ALTER TABLE "mekan_etkilesimleri" ADD CONSTRAINT "mekan_etkilesimleri_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_favorites" ADD CONSTRAINT "app_favorites_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_favorites" ADD CONSTRAINT "app_favorites_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_duraklari" ADD CONSTRAINT "rota_duraklari_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "rotalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_duraklari" ADD CONSTRAINT "rota_duraklari_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_tamamlamalari" ADD CONSTRAINT "rota_tamamlamalari_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "rotalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_tamamlamalari" ADD CONSTRAINT "rota_tamamlamalari_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_push_subscriptions" ADD CONSTRAINT "app_push_subscriptions_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
