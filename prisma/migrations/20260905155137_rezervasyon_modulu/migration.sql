-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "kapasite" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "planX" DOUBLE PRECISION,
ADD COLUMN     "planY" DOUBLE PRECISION,
ADD COLUMN     "sekil" TEXT NOT NULL DEFAULT 'kare',
ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "bolgeler" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bolgeler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rezervasyonlar" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "misafirAdi" TEXT NOT NULL,
    "telefon" TEXT,
    "kisiSayisi" INTEGER NOT NULL,
    "not" TEXT,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'onaylandi',
    "kanal" TEXT NOT NULL DEFAULT 'panel',
    "olusturanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rezervasyonlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rezervasyon_masalari" (
    "id" TEXT NOT NULL,
    "rezervasyonId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "rezervasyon_masalari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bolgeler_businessId_idx" ON "bolgeler"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "bolgeler_businessId_ad_key" ON "bolgeler"("businessId", "ad");

-- CreateIndex
CREATE INDEX "rezervasyonlar_businessId_baslangic_idx" ON "rezervasyonlar"("businessId", "baslangic");

-- CreateIndex
CREATE INDEX "rezervasyonlar_businessId_durum_idx" ON "rezervasyonlar"("businessId", "durum");

-- CreateIndex
CREATE INDEX "rezervasyon_masalari_tableId_idx" ON "rezervasyon_masalari"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "rezervasyon_masalari_rezervasyonId_tableId_key" ON "rezervasyon_masalari"("rezervasyonId", "tableId");

-- CreateIndex
CREATE INDEX "tables_zoneId_idx" ON "tables"("zoneId");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "bolgeler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolgeler" ADD CONSTRAINT "bolgeler_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rezervasyonlar" ADD CONSTRAINT "rezervasyonlar_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rezervasyon_masalari" ADD CONSTRAINT "rezervasyon_masalari_rezervasyonId_fkey" FOREIGN KEY ("rezervasyonId") REFERENCES "rezervasyonlar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rezervasyon_masalari" ADD CONSTRAINT "rezervasyon_masalari_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

