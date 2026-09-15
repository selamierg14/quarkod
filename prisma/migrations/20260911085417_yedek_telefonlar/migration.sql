-- CreateTable
CREATE TABLE "user_phones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_phones_userId_idx" ON "user_phones"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_phones_userId_phone_key" ON "user_phones"("userId", "phone");

-- AddForeignKey
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
