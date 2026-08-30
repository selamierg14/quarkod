import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Kasada okutulan kuponun dönen doğrulama kodu.
 *
 * Sorun şu: cüzdandaki kupon sabit bir kod taşısaydı, kullanıcı ekran
 * görüntüsünü alıp arkadaş grubuna atar ve tek kupon on kişide kullanılırdı.
 * Kodu her seferinde sunucudan almak da çözüm değil — kasada internet
 * kopabiliyor ve kod yine ekran görüntüsüyle taşınabilir.
 *
 * Çözüm: kod, kuponun kimliğinden ve İÇİNDE BULUNULAN ZAMAN
 * PENCERESİNDEN türetilen bir HMAC. Ekran görüntüsü en fazla pencere
 * süresi kadar yaşıyor; sonra kod kendiliğinden geçersizleşiyor.
 *
 * Kod sunucuda üretiliyor ve sunucuda doğrulanıyor; gizli anahtar hiçbir
 * zaman istemciye gitmiyor.
 */

/**
 * Kod penceresi: 15 dakika.
 *
 * Kısaltmak kasada sıra beklerken kodun ölmesine yol açar (müşteri kodu
 * açıyor, üç kişi önünde var, ödemeye geldiğinde kod geçersiz). Uzatmak
 * ekran görüntüsünün paylaşılabilir kalma süresini artırır. 15 dakika
 * ikisi arasında makul bir denge.
 */
export const PENCERE_SANIYE = 15 * 60;

/**
 * Doğrulamada kabul edilen önceki pencere sayısı.
 *
 * Kullanıcı kodu pencerenin son saniyesinde açıp kasaya yürüyor olabilir;
 * bir önceki pencereyi de kabul etmek bu sınır durumunu kurtarıyor.
 * Pratik ömür böylece 15-30 dakika arasında.
 */
const GERIYE_TOLERANS = 1;

function gizliAnahtar(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET tanımlı değil veya çok kısa. .env dosyasına en az 32 karakterlik bir değer yazın.",
    );
  }
  return secret;
}

export function pencereNumarasi(simdi: Date = new Date()): number {
  return Math.floor(simdi.getTime() / 1000 / PENCERE_SANIYE);
}

/**
 * Belirli bir pencere için kodu üretir.
 *
 * Kod insan tarafından okunabilir ve söylenebilir olmalı: kasada karekod
 * okunamadığında garson kodu elle girebilmeli. Bu yüzden 8 haneli, büyük
 * harf ve rakamdan oluşan bir dize — karışan karakterler (0/O, 1/I) baştan
 * dışarıda.
 */
const ALFABE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function kuponKodu(kuponId: string, pencere: number): string {
  const ozet = createHmac("sha256", gizliAnahtar())
    .update(`${kuponId}|${pencere}`)
    .digest();

  let kod = "";
  for (let i = 0; i < 8; i++) {
    kod += ALFABE[ozet[i] % ALFABE.length];
  }
  return kod;
}

/** Şu anki pencere için kod ve pencerenin bitişine kalan saniye. */
export function guncelKupon(kuponId: string, simdi: Date = new Date()) {
  const pencere = pencereNumarasi(simdi);
  const bitis = (pencere + 1) * PENCERE_SANIYE * 1000;
  return {
    kod: kuponKodu(kuponId, pencere),
    kalanSaniye: Math.max(0, Math.round((bitis - simdi.getTime()) / 1000)),
  };
}

/**
 * Kasada girilen kodun bu kupona ait ve hâlâ geçerli olup olmadığı.
 *
 * Karşılaştırma sabit sürede: kodun ne kadarının doğru olduğunu yanıt
 * süresinden çıkarmak, sekiz haneyi tek tek denemeyi mümkün kılardı.
 */
export function kuponKoduGecerliMi(
  kuponId: string,
  girilen: string,
  simdi: Date = new Date(),
): boolean {
  const temiz = girilen.trim().toUpperCase();
  if (temiz.length !== 8) return false;

  const simdikiPencere = pencereNumarasi(simdi);
  for (let geri = 0; geri <= GERIYE_TOLERANS; geri++) {
    const beklenen = kuponKodu(kuponId, simdikiPencere - geri);
    const a = Buffer.from(beklenen);
    const b = Buffer.from(temiz);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
