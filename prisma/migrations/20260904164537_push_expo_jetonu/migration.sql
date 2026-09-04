-- AlterTable
ALTER TABLE "app_push_subscriptions" ADD COLUMN     "expoToken" TEXT,
ADD COLUMN     "platform" TEXT,
ALTER COLUMN "endpoint" DROP NOT NULL,
ALTER COLUMN "p256dh" DROP NOT NULL,
ALTER COLUMN "auth" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "app_push_subscriptions_expoToken_key" ON "app_push_subscriptions"("expoToken");

