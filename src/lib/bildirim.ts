import "server-only";
import { prisma } from "./db";
import { kullanicilaraPushGonder } from "./push";

/**
 * Panel geneli bildirim gönderimi — hem kalıcı zil kaydı hem (varsa) anlık
 * push, TEK çağrıdan.
 *
 * İki taraf bilerek birbirinden bağımsız çalışıyor: push için VAPID kurulu
 * değilse ya da alıcının açık bir cihazı yoksa `kullanicilaraPushGonder`
 * sessizce hiçbir şey yapmaz (bkz. lib/push.ts) — zil kaydı yine de açılır.
 * Yani bir kullanıcı bildirim iznini hiç vermemiş olsa bile paneli açtığında
 * zilde "izin talebiniz onaylandı" gibi olayları görebiliyor.
 *
 * Gönderim asla çağıran işlemi bozmaz: bir olay (izin kararı, vardiya
 * ataması) zaten veritabanına yazıldıktan SONRA çağrılmalı; burada atılan
 * bir hata (ör. push servisi zaman aşımı) o işlemi geri almaz — yalnızca
 * log'a düşer.
 */
export type BildirimTuru = "vardiya.atandi" | "izin.talep" | "izin.karar";

export async function bildirimGonder(
  userIds: string[],
  bildirim: { tur: BildirimTuru; baslik: string; govde: string; url: string },
): Promise<void> {
  const aliciler = [...new Set(userIds)];
  if (aliciler.length === 0) return;

  try {
    await prisma.panelNotification.createMany({
      data: aliciler.map((userId) => ({
        userId,
        type: bildirim.tur,
        title: bildirim.baslik,
        body: bildirim.govde,
        url: bildirim.url,
      })),
    });
  } catch (error) {
    console.error("[bildirim] zil kaydı yazılamadı:", error);
  }

  try {
    await kullanicilaraPushGonder(aliciler, {
      baslik: bildirim.baslik,
      govde: bildirim.govde,
      url: bildirim.url,
    });
  } catch (error) {
    console.error("[bildirim] push gönderilemedi:", error);
  }
}
