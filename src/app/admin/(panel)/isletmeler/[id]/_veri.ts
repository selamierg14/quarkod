import "server-only";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireIsletmeSayfasi } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";

/**
 * İşletme sekmelerinin ortak yükleyicisi: yetki kontrolü + kayıt.
 *
 * Dört sekme de aynı kapıdan geçiyor; kontrolü tek yerde tutmak, yeni bir
 * sekme eklendiğinde yetkiyi eklemeyi unutma riskini ortadan kaldırıyor.
 */
export async function isletmeyiYukle(id: string) {
  /**
   * `requireUser` DEĞİL: menüde gizli olması yetmiyordu, garson adres
   * çubuğundan bu sekmeleri açıp ayarları kaydedebiliyordu (canlı
   * doğrulandı — denetim kaydına `business.update / garson` düştü).
   */
  const user = await requireIsletmeSayfasi();
  if (!(await canAccessBusiness(user, id))) notFound();

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
      tables: true,
    },
  });
  if (!business) notFound();

  return { user, business };
}
