-- Uygulamadan masa rezervasyonu.
-- İşletme anahtarı varsayılan KAPALI: masa kapasiteleri ve çalışma
-- saatleri girilmeden açılırsa otomatik masa seçimi yanlış çalışır.
ALTER TABLE "businesses" ADD COLUMN "rezervasyonAcik" BOOLEAN NOT NULL DEFAULT false;

-- Talebi gönderen tüketici. SetNull: hesap silinse de işletmenin
-- operasyon kaydı (kaç kişi gelmedi) kalmalı.
ALTER TABLE "rezervasyonlar" ADD COLUMN "appUserId" TEXT;

ALTER TABLE "rezervasyonlar"
  ADD CONSTRAINT "rezervasyonlar_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "rezervasyonlar_appUserId_baslangic_idx" ON "rezervasyonlar"("appUserId", "baslangic");
