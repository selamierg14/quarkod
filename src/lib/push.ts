import "server-only";
import webpush from "web-push";
import { prisma } from "./db";

/**
 * Web Push gönderimi.
 *
 * VAPID anahtarları yoksa özellik tamamen kapalı: hiçbir sorgu atılmaz,
 * hiçbir kayıt açılmaz. Bu, e-postadaki `postaAktifMi()` ile aynı desen —
 * kurulmamış bir kanal sessizce yok sayılır, hata üretmez.
 */
export function vapidHazirMi(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

let yapilandirildi = false;
function vapidYapilandir() {
  if (yapilandirildi || !vapidHazirMi()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:destek@quarkod.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  yapilandirildi = true;
}

export type PushIcerik = { baslik: string; govde: string; url: string };

/**
 * Birden fazla kullanıcının tüm açık cihazlarına aynı bildirimi gönderir.
 *
 * Tek kullanıcılık bir sürüm yerine çoğul: çağıran taraf (düşük puan
 * bildirimi) hep "bu işletmenin sahibi + sorumlusu" gibi bir küme ile
 * geliyordu ve kullanıcı başına ayrı sorgu atmak, müşteriye ait sıcak
 * yolda gereksiz bir N+1 demekti. Artık tek findMany yetiyor.
 *
 * Dönen harita YALNIZCA açık aboneliği olan kullanıcıları içerir: anahtarın
 * hiç olmaması "cihazı yok" (kayıt açmaya değmez), değerin 0 olması
 * "cihazı var ama ulaşılamadı" (kaydedilmeli) demek. Bu ayrım, panelde
 * her düşük puan için sahte "gönderilemedi" satırı birikmesini önlüyor.
 */
export async function kullanicilaraPushGonder(
  userIds: string[],
  icerik: PushIcerik,
): Promise<Map<string, number>> {
  const sonuc = new Map<string, number>();
  if (!vapidHazirMi() || userIds.length === 0) return sonuc;
  vapidYapilandir();

  const abonelikler = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds }, disabledAt: null },
  });
  if (abonelikler.length === 0) return sonuc;

  for (const abonelik of abonelikler) {
    sonuc.set(abonelik.userId, 0);
  }

  const yuk = JSON.stringify(icerik);

  // Cihazlar birbirini beklemesin: biri zaman aşımına uğrarsa diğerleri
  // yine de zamanında düşsün.
  await Promise.all(
    abonelikler.map(async (abonelik) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonelik.endpoint,
            keys: { p256dh: abonelik.p256dh, auth: abonelik.auth },
          },
          yuk,
        );
        sonuc.set(abonelik.userId, (sonuc.get(abonelik.userId) ?? 0) + 1);
      } catch (error) {
        const durum = (error as { statusCode?: number }).statusCode;
        // 404/410: push servisi "bu cihaz artık yok" diyor. Satırı silmek
        // yerine kapatıyoruz — "bildirimim gelmiyor" şikayetinde aboneliğin
        // hiç açılmadığı mı, yoksa cihazın mı düştüğü ancak böyle anlaşılır.
        if (durum === 404 || durum === 410) {
          await prisma.pushSubscription
            .update({
              where: { id: abonelik.id },
              data: {
                disabledAt: new Date(),
                disabledReason: `Push servisi cihazı tanımıyor (${durum}).`,
              },
            })
            .catch(() => {});
        } else {
          console.error("[push] gönderilemedi:", error);
        }
      }
    }),
  );

  return sonuc;
}
