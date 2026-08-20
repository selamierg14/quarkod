import "server-only";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * İşletme sekmelerinin ortak yükleyicisi: yetki kontrolü + kayıt.
 *
 * Dört sekme de aynı kapıdan geçiyor; kontrolü tek yerde tutmak, yeni bir
 * sekme eklendiğinde yetkiyi eklemeyi unutma riskini ortadan kaldırıyor.
 */
export async function isletmeyiYukle(id: string) {
  const user = await requireUser();
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
