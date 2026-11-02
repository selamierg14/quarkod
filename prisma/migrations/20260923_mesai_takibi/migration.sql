-- PERSONEL MESAİ TAKİBİ.
-- QR mekana asılıyor, personel kendi telefonundan okutuyor; tek koruma
-- işletmenin genel IP'si. IP listesi boşken sistem hiç çalışmıyor.
ALTER TABLE "businesses" ADD COLUMN "mesaiQrToken" TEXT;
ALTER TABLE "businesses" ADD COLUMN "mesaiIpleri" TEXT;
CREATE UNIQUE INDEX "businesses_mesaiQrToken_key" ON "businesses"("mesaiQrToken");

CREATE TABLE "mesai_kayitlari" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giris" TIMESTAMP(3) NOT NULL,
    "cikis" TIMESTAMP(3),
    "girisIpKarmasi" TEXT,
    "cikisIpKarmasi" TEXT,
    "girisKaynak" TEXT NOT NULL DEFAULT 'qr',
    "cikisKaynak" TEXT,
    "duzeltenId" TEXT,
    "duzeltmeNotu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mesai_kayitlari_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mesai_kayitlari_businessId_giris_idx" ON "mesai_kayitlari"("businessId", "giris");
CREATE INDEX "mesai_kayitlari_userId_giris_idx" ON "mesai_kayitlari"("userId", "giris");

ALTER TABLE "mesai_kayitlari" ADD CONSTRAINT "mesai_kayitlari_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mesai_kayitlari" ADD CONSTRAINT "mesai_kayitlari_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AÇIK KAYIT EN FAZLA BİR TANE.
-- Kısmi tekil indeks: aynı kişinin çıkışı yapılmamış ikinci bir kaydı
-- olamaz. İki cihazdan aynı anda okutma ya da çift dokunuş, uygulama
-- katmanındaki kontrolün arasından sızabilirdi; bu kısıt veritabanında
-- kapatıyor.
CREATE UNIQUE INDEX "mesai_tek_acik_kayit" ON "mesai_kayitlari"("userId") WHERE "cikis" IS NULL;
