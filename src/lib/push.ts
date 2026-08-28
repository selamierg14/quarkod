import "server-only";
import webpush from "web-push";
import { prisma } from "./db";

/**
 * Push bildirimi altyapısı.
 *
 * Web Push standardı: tarayıcı bir "abonelik" (endpoint + iki anahtar)
 * üretir, biz o aboneliğe VAPID anahtarlarımızla imzalanmış bir mesaj
 * göndeririz, Apple/Google'ın push servisi bunu cihaza iletir. Sunucumuz
 * hiçbir zaman cihazla doğrudan konuşmaz ve sürekli bir bağlantı tutmaz —
 * tek seferlik, olay bazlı bir HTTP isteği, tıpkı e-posta göndermek gibi.
 *
 * iOS 16.4+ bunu destekliyor ama YALNIZCA site "Ana Ekrana Ekle" ile
 * eklenmişken; Safari sekmesinde açıkken abone olma isteği reddedilir.
 * Bu kısıt burada değil, abonelik arayüzünde (BildirimAyarlari.tsx)
 * kontrol ediliyor.
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

export type PushIcerik = {
  baslik: string;
  govde: string;
  /** Bildirime tıklanınca açılacak adres, örn. "/admin/geri-bildirimler/abc". */
  url: string;
};

/**
 * Bir kullanıcının tüm cihazlarına bildirim gönderir.
 *
 * Tek bir kullanıcının telefonu + masaüstü gibi birden fazla abone
 * kaydı olabilir; hepsine aynı anda, paralel gönderilir. Geçersiz hâle
 * gelmiş bir abonelik (kullanıcı bildirimleri kapattı, tarayıcı verisini
 * sildi) push servisinden 404/410 döner — bu satır artık işe yaramıyor
 * demektir, sessizce siliniyor ki tablo ölü kayıtlarla şişmesin.
 */
export async function kullaniciyaPushGonder(
  userId: string,
  icerik: PushIcerik,
): Promise<{ gonderilen: number }> {
  if (!vapidHazirMi()) return { gonderilen: 0 };
  vapidYapilandir();

  const abonelikler = await prisma.pushSubscription.findMany({ where: { userId } });
  if (abonelikler.length === 0) return { gonderilen: 0 };

  const yuk = JSON.stringify(icerik);

  const sonuclar = await Promise.all(
    abonelikler.map(async (abonelik) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonelik.endpoint,
            keys: { p256dh: abonelik.p256dh, auth: abonelik.auth },
          },
          yuk,
        );
        return true;
      } catch (error) {
        const durum = (error as { statusCode?: number }).statusCode;
        // 404/410: push servisi bu aboneliğin artık geçersiz olduğunu
        // söylüyor (kullanıcı izni geri aldı, tarayıcı verisi silindi vb.).
        if (durum === 404 || durum === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: abonelik.id } })
            .catch(() => {});
        } else {
          console.error("[push] gönderilemedi:", error);
        }
        return false;
      }
    }),
  );

  return { gonderilen: sonuclar.filter(Boolean).length };
}
