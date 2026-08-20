-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "vardiyaAksamAktif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vardiyaAksamSaat" TEXT NOT NULL DEFAULT '16:00',
ADD COLUMN     "vardiyaGeceAktif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vardiyaGeceSaat" TEXT NOT NULL DEFAULT '23:00',
ADD COLUMN     "vardiyaOgleAktif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vardiyaOgleSaat" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "vardiyaSabahAktif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vardiyaSabahSaat" TEXT NOT NULL DEFAULT '06:00';
