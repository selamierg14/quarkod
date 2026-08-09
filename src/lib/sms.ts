import "server-only";

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

/** Numarayı sağlayıcının beklediği biçime çevirir: 905XXXXXXXXX (sayı). */
export function toSmsNumber(phone: string): number | null {
  const digits = phone.replace(/\D/g, "");

  let local: string | null = null;
  if (digits.length === 12 && digits.startsWith("90")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 10) local = digits;

  if (!local || !local.startsWith("5")) return null;
  return Number(`90${local}`);
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
        title: "Doğrulama kodu",
        content: text,
        number,
        encoding: 0,
        sender,
        periodicSettings: null,
        sendingDate: null,
        // Kod kısa ömürlü; sağlayıcıda da uzun süre beklemesin.
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
