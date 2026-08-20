-- CreateTable
CREATE TABLE "duyurular" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "imageUrl" TEXT,
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duyurular_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "duyurular_businessId_aktif_idx" ON "duyurular"("businessId", "aktif");

-- AddForeignKey
ALTER TABLE "duyurular" ADD CONSTRAINT "duyurular_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
