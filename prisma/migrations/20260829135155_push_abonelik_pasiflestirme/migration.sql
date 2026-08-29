-- Push abonelikleri artık silinmiyor, pasifleştiriliyor.
--
-- Prisma'nın ürettiği hâli `updatedAt` sütununu varsayılansız NOT NULL
-- ekliyordu; tabloda tek bir satır bile varsa migration orada patlar.
-- Mevcut satırlara CURRENT_TIMESTAMP veriyoruz (ilk kayıt anı bilinmiyor,
-- "en son şimdi görüldü" kabul etmek güvenli), sonra varsayılanı bırakıyoruz:
-- bundan sonrasını Prisma @updatedAt yönetiyor.

-- AlterTable
ALTER TABLE "push_subscriptions" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "push_subscriptions" ADD COLUMN "disabledReason" TEXT;
ALTER TABLE "push_subscriptions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropIndex — aşağıdaki bileşik indeks bunun işini de görüyor.
DROP INDEX "push_subscriptions_userId_idx";

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_disabledAt_idx" ON "push_subscriptions"("userId", "disabledAt");
