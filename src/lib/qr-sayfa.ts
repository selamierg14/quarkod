import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "./db";
import { hesapAktifMi } from "./abonelik";
import { gorselAdresi } from "./gorsel-adres";

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
    // Logo ve kapak, veritabanında data URI olarak duruyor ama müşteriye
    // adresle veriliyor. Üç QR sayfası da buradan geçtiği için değişiklik
    // tek noktada: aksi halde her sayfa 110 KB'lık base64'ü HTML'e ve RSC
    // yüküne ayrı ayrı gömüyordu (bkz. src/lib/gorsel-adres.ts).
    business: {
      ...business,
      logoUrl: gorselAdresi(business.id, "logo", business.logoUrl),
      coverUrl: gorselAdresi(business.id, "kapak", business.coverUrl),
    },
    table,
    tableLabel: table.isEntrance ? "Giriş" : `Masa ${table.tableNumber}`,
    menuAcik: business.account.menuEnabled,
  };
}

// Menü içeriği önbellekten okunuyor; bkz. src/lib/menu-onbellek.ts.
export { menuIcerigi } from "./menu-onbellek";
