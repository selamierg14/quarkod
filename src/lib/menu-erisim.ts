import "server-only";
import { prisma } from "./db";

/**
 * QR menü modülü bu işletmede kullanılabilir mi.
 *
 * Modül hesap düzeyinde satıldığı için karar işletmenin bağlı olduğu
 * hesaba ait. Ekranı gizlemek yeterli değil: modülü almamış bir müşteri
 * server action'ları doğrudan çağırıp menü kurabilirdi.
 */
export async function menuAcikMi(businessId: string): Promise<boolean> {
  const isletme = await prisma.business.findUnique({
    where: { id: businessId },
    select: { account: { select: { menuEnabled: true } } },
  });
  return Boolean(isletme?.account.menuEnabled);
}
