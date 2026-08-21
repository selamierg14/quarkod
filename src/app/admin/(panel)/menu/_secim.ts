import "server-only";
import { visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { masaSirala } from "@/lib/masa";
import type { SessionUser } from "@/lib/auth";

/**
 * Menü sekmelerinin ortak yükleyicisi: hangi işletme, modül açık mı ve
 * önizlemenin hangi adresten açılacağı.
 *
 * Önizleme adresi sabit "1" masasıyla kuruluyordu; o masa silinmiş ya da
 * işletme tek ortak QR'a geçmişse müşteri sayfası "Bu karekod artık geçerli
 * değil" hatası veriyordu — kendi menüsüne bakan işletmeciye gösterilecek
 * en yanlış ekran. Artık gerçek bir QR noktası seçiliyor.
 */
export async function menuSecimi(user: SessionUser, isletmeId?: string) {
  const businesses = await visibleBusinesses(user);
  if (businesses.length === 0) {
    return {
      businesses,
      secili: null,
      menuAcik: false,
      onizlemeMasa: null as string | null,
      urunSayisi: 0,
    };
  }

  const secili = businesses.find((b) => b.id === isletmeId) ?? businesses[0];

  const [hesap, masalar, urunSayisi] = await Promise.all([
    prisma.business.findUnique({
      where: { id: secili.id },
      select: { account: { select: { menuEnabled: true } } },
    }),
    prisma.table.findMany({
      where: { businessId: secili.id, active: true },
      select: { tableNumber: true, isEntrance: true },
    }),
    prisma.menuItem.count({
      where: { businessId: secili.id, active: true, category: { active: true } },
    }),
  ]);

  // masaSirala giriş QR'ını başa alıyor; önizleme için de en doğal seçim o.
  const onizlemeMasa = masaSirala(masalar)[0]?.tableNumber ?? null;

  return {
    businesses,
    secili,
    menuAcik: Boolean(hesap?.account.menuEnabled),
    onizlemeMasa,
    urunSayisi,
  };
}
