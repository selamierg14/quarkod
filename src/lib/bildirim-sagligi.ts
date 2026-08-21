import "server-only";
import { prisma } from "./db";

/**
 * Düşük puan bildirimleri gerçekten gidiyor mu?
 *
 * Ürünün satış cümlesi "düşük puanı anında haber alın". Bu söz tek bir
 * yerde tutuluyor: eşik altı bir puan gelince e-posta gönderilmesi. Gönderim
 * başarısız olduğunda kayıt Notification tablosuna hatasıyla yazılıyor ama
 * bunu kimse görmüyordu — ne işletme sahibi ne de panel.
 *
 * Canlıda ölçüldü: iki bildirim denemesinin ikisi de "SMTP yapılandırılmamış"
 * hatasıyla düşmüştü ve panelde hiçbir iz yoktu. İşletme sahibi, bildirim
 * sisteminin çalıştığını sanarak bekliyordu.
 *
 * Burası o sessizliği bozuyor.
 */

export type BildirimSagligi = {
  basarisiz: number;
  sonHata: string;
  sonDeneme: Date;
};

/** Son 7 günde gönderilemeyen bildirimler. Sorun yoksa null. */
export async function bildirimSagligi(
  businessIds: string[],
): Promise<BildirimSagligi | null> {
  if (businessIds.length === 0) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = {
    sentAt: null,
    createdAt: { gte: since },
    feedback: { businessId: { in: businessIds } },
  };

  const [basarisiz, son] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { error: true, createdAt: true },
    }),
  ]);

  if (basarisiz === 0 || !son) return null;

  return {
    basarisiz,
    sonHata: son.error ?? "Sebep kaydedilmemiş.",
    sonDeneme: son.createdAt,
  };
}
