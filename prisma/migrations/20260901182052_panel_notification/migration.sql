-- CreateTable
CREATE TABLE "panel_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "panel_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "panel_notifications_userId_read_idx" ON "panel_notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "panel_notifications_userId_createdAt_idx" ON "panel_notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "panel_notifications" ADD CONSTRAINT "panel_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
