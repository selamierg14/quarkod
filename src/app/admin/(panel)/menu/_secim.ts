import "server-only";
import { visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/**
 * Düzenle ve Listele sekmeleri aynı "hangi işletme, menü modülü açık mı"
 * mantığını paylaşıyor — burada tek yerde.
 */
export async function menuSecimi(user: SessionUser, isletmeId?: string) {
  const businesses = await visibleBusinesses(user);
  if (businesses.length === 0) return { businesses, secili: null, menuAcik: false };

  const secili = businesses.find((b) => b.id === isletmeId) ?? businesses[0];
  const menuAcik = await prisma.business
    .findUnique({
      where: { id: secili.id },
      select: { account: { select: { menuEnabled: true } } },
    })
    .then((b) => Boolean(b?.account.menuEnabled));

  return { businesses, secili, menuAcik };
}
