-- CreateTable
CREATE TABLE "iptal_edilen_jetonlar" (
    "jti" TEXT NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iptal_edilen_jetonlar_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "iptal_edilen_jetonlar_bitis_idx" ON "iptal_edilen_jetonlar"("bitis");

