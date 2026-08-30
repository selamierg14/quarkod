-- CreateTable
CREATE TABLE "app_visits" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tableId" TEXT,
    "mesafeMetre" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_visits_appUserId_businessId_createdAt_idx" ON "app_visits"("appUserId", "businessId", "createdAt");

-- CreateIndex
CREATE INDEX "app_visits_businessId_createdAt_idx" ON "app_visits"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "app_visits" ADD CONSTRAINT "app_visits_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_visits" ADD CONSTRAINT "app_visits_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_visits" ADD CONSTRAINT "app_visits_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
