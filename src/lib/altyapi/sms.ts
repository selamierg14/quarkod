import "server-only";
import { normalizePhone } from "../kimlik/username";

/**
 * SMS gönderimi (ekomesaj).
 *
 * 2FA kodları ve şifre sıfırlama buradan geçer. Anahtarlar .env'de; kodda
 * sabit değer yok.
 *
 * İstek gövdesi sağlayıcının beklediği alan adlarını birebir izler — araya
 * çeviri koymak, üretimde sessiz hata üretmenin kolay yolu olurdu.
 */

export type SmsResult = { sent: boolean; error?: string; packageId?: number };

/**
 * Numarayı sağlayıcının beklediği biçime çevirir: 905XXXXXXXXX (sayı).
 *
 * Kurallar burada TEKRARLANMIYOR. Aynı normalleştirme (hangi uzunluklar
 * kabul, "5" ile başlama şartı) `lib/kimlik/username.ts` içinde zaten
 * vardı ve buradaki kopya birebir aynı mantığı ikinci kez yazıyordu.
 * İkisinden biri değişip diğeri kalsaydı ortaya en sinsi hata çıkardı:
 * panelin "geçerli" saydığı bir numara sağlayıcıya gönderilemez olurdu ve
 * bu ancak SMS gitmediğinde fark edilirdi.
 */
export function toSmsNumber(phone: string): number | null {
  const normal = normalizePhone(phone);
  // `+905321234567` → `905321234567`
  return normal ? Number(normal.slice(1)) : null;
}

export async function sendSms(phone: string, text: string): Promise<SmsResult> {
  const url = process.env.SMS_API_URL;
  const user = process.env.SMS_API_USER;
  const pass = process.env.SMS_API_PASS;
  const sender = process.env.SMS_SENDER;

  if (!url || !user || !pass || !sender) {
    // Ayar yoksa kodu konsola düşür: geliştirme ortamında akış tıkanmasın.
    console.warn(`[sms] Ayarlanmamış — ${phone} numarasına gidecekti:\n${text}`);
    return { sent: false, error: "SMS ayarları eksik (.env içindeki SMS_* alanları)" };
  }

  const number = toSmsNumber(phone);
  if (number === null) {
    return { sent: false, error: "Telefon numarası geçersiz." };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
      },
      body: JSON.stringify({
        type: 1,
        sendingType: 0,
        // `title` sağlayıcı panelinde görünen paket etiketi (örnek istekte
        // "X tarihli tekil test" yazıyordu) — gönderici başlığı DEĞİL.
        // Gönderici başlığı `sender` ve o, .env'deki SMS_SENDER'dan geliyor.
        title: "Dogrulama kodu",
        content: text,
        number,
        encoding: 0,
        sender,
        periodicSettings: null,
        sendingDate: null,
        // Sağlayıcının teslimat deneme penceresi (dakika). Örnek istekteki
        // değer korundu: kodun kendi ömrü 3 dakika ama bunu 3'e çekmek,
        // operatör kaynaklı kısa bir gecikmede mesajın hiç teslim
        // edilmemesine yol açardı. Geç gelen bir kod en azından "süresi
        // doldu, yenisini iste" diyebiliyor; hiç gelmeyen kod sessiz.
        validity: 60,
        pushSettings: null,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return { sent: false, error: `SMS sağlayıcısı ${response.status} döndü.` };
    }

    const data = (await response.json()) as {
      err?: unknown;
      data?: { pkgID?: number };
    };

    if (data.err) {
      return { sent: false, error: `SMS sağlayıcısı hata verdi: ${String(data.err)}` };
    }

    return { sent: true, packageId: data.data?.pkgID };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sms] gönderilemedi:", message);
    return { sent: false, error: "SMS gönderilemedi." };
  }
}
