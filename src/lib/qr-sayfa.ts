import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "./db";
import { hesapAktifMi } from "./abonelik";

/**
 * QR'la açılan üç sayfanın (karşılama, anket, menü) ortak girişi.
 *
 * Aynı kontroller üç yerde tekrarlanacaktı: işletme var mı, aboneliği
 * sürüyor mu, masa geçerli mi. Biri unutulsaydı süresi dolmuş bir hesabın
 * menüsü yayında kalırdı.
 */
export async function qrSayfaVerisi(slug: string, tableParam: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      account: { select: { active: true, expiresAt: true, menuEnabled: true } },
      categories: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  // Askıya alınan ya da süresi dolan hesabın QR'ları çalışmaz.
  if (!business || !hesapAktifMi(business.account)) notFound();

  const table = await prisma.table.findUnique({
    where: {
      businessId_tableNumber: {
        businessId: business.id,
        tableNumber: decodeURIComponent(tableParam),
      },
    },
  });
  if (!table || !table.active) notFound();

  return {
    business,
    table,
    tableLabel: table.isEntrance ? "Giriş" : `Masa ${table.tableNumber}`,
    menuAcik: business.account.menuEnabled,
  };
}

// Menü içeriği önbellekten okunuyor; bkz. src/lib/menu-onbellek.ts.
export { menuIcerigi } from "./menu-onbellek";
