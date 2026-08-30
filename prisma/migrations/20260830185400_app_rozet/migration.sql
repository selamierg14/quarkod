-- CreateTable
CREATE TABLE "app_badges" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "rozet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_badges_appUserId_idx" ON "app_badges"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "app_badges_appUserId_rozet_key" ON "app_badges"("appUserId", "rozet");

-- AddForeignKey
ALTER TABLE "app_badges" ADD CONSTRAINT "app_badges_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
