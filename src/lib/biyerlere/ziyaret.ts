import { mesafeMetre, type Koordinat } from "./mekan";

/**
 * Doğrulanmış masa ziyareti kuralları.
 *
 * Biyerlere'nin en değerli iddiası "sahte yorum yok": puan ve rozet
 * yalnızca kişi GERÇEKTEN mekandayken kazanılıyor. Kurallar burada saf
 * fonksiyonlarda çünkü ikisi de yanlış olursa pahalıya patlıyor —
 * gevşek olursa evden puan toplanır, sıkı olursa gerçek müşteri
 * masasında oturduğu halde puan alamaz.
 */

/**
 * Kabul edilen en büyük mesafe.
 *
 * 100 metre "içeride mi" sorusuna telefon GPS'iyle verilebilecek en dar
 * makul cevap: kapalı mekanda GPS hatası şehirde rahat 20-50 metre
 * bulabiliyor, bunu 25 metreye çekmek masadaki gerçek müşteriyi
 * reddetmeye başlardı. Öte yandan 100 metre, "karşı sokaktan puan
 * verme"yi engelleyecek kadar dar.
 */
export const EN_UZAK_MESAFE_METRE = 100;

/**
 * Aynı mekanda iki doğrulanmış ziyaret arasındaki en kısa süre.
 *
 * 4 saat: sabah kahvesi ile akşam yemeği ayrı ziyaret sayılsın ama
 * masada oturup arka arkaya QR okutarak puan biriktirmek işe yaramasın.
 * Rozet eşikleri (ör. "aynı kafeyi ayda 4 kez ziyaret et") bu pencereye
 * göre anlamlı kalıyor.
 */
export const ZIYARET_BEKLEME_SAATI = 4;

/** Doğrulanmış bir ziyaretin kazandırdığı kaşif puanı. */
export const ZIYARET_PUANI = 50;

/**
 * Masa anketini doldurmanın kazandırdığı puan — ZIYARET_PUANI'NDEN
 * BİLEREK KÜÇÜK.
 *
 * Anket, ziyaretin aksine GPS doğrulaması istemiyor: fiziksel QR'ı bilen
 * herkes (masaya oturmadan, linki biri paylaşsa bile) doldurabilir. Aynı
 * puanı vermek "doğrulanmış ziyaret" iddiasının değerini düşürürdü — bu
 * yüzden anket kendi başına rozet de açmıyor, yalnızca küçük bir teşekkür
 * puanı veriyor (bkz. src/app/f/[slug]/[table]/actions.ts, submitFeedback).
 */
export const ANKET_KATILIM_PUANI = 10;

export type ZiyaretRedNedeni =
  | "konum-yok"
  | "mekan-konumsuz"
  | "uzakta"
  | "cok-erken";

export type ZiyaretKarari =
  | { kabul: true; mesafeMetre: number }
  | { kabul: false; neden: ZiyaretRedNedeni; mesafeMetre: number | null };

/**
 * Ziyaretin sayılıp sayılmayacağına karar verir.
 *
 * `sonZiyaret` aynı kişinin aynı mekandaki en son doğrulanmış ziyareti;
 * yoksa null. Bekleme penceresi mekan bazında: bir kişi aynı gün beş
 * farklı kafeye gidip beşinden de puan alabilmeli.
 */
export function ziyaretKarari(girdi: {
  kullaniciKonumu: Koordinat | null;
  mekanKonumu: Koordinat | null;
  sonZiyaret: Date | null;
  simdi?: Date;
}): ZiyaretKarari {
  const simdi = girdi.simdi ?? new Date();

  // Konum reddi mesafe hesabından ÖNCE: konum yoksa "ne kadar uzakta"
  // sorusunun cevabı yok, uydurma bir mesafe döndürmek yanıltıcı olurdu.
  if (!girdi.kullaniciKonumu) {
    return { kabul: false, neden: "konum-yok", mesafeMetre: null };
  }
  if (!girdi.mekanKonumu) {
    return { kabul: false, neden: "mekan-konumsuz", mesafeMetre: null };
  }

  const mesafe = mesafeMetre(girdi.kullaniciKonumu, girdi.mekanKonumu);
  if (mesafe > EN_UZAK_MESAFE_METRE) {
    return { kabul: false, neden: "uzakta", mesafeMetre: mesafe };
  }

  // Bekleme kontrolü en sona: kişi mekandaysa ama henüz süre dolmamışsa
  // ona "uzaktasın" demek yanlış bilgi olurdu.
  if (girdi.sonZiyaret) {
    const gecenSaat =
      (simdi.getTime() - girdi.sonZiyaret.getTime()) / (1000 * 60 * 60);
    if (gecenSaat < ZIYARET_BEKLEME_SAATI) {
      return { kabul: false, neden: "cok-erken", mesafeMetre: mesafe };
    }
  }

  return { kabul: true, mesafeMetre: mesafe };
}

/** Kullanıcıya gösterilecek Türkçe açıklama. */
export function redMesaji(neden: ZiyaretRedNedeni): string {
  switch (neden) {
    case "konum-yok":
      return "Ziyareti doğrulamak için konum izni gerekiyor.";
    case "mekan-konumsuz":
      return "Bu mekanın konumu henüz tanımlı değil; ziyaret doğrulanamıyor.";
    case "uzakta":
      return "Puan kazanmak için mekanda olmanız gerekiyor.";
    case "cok-erken":
      return `Aynı mekanda ${ZIYARET_BEKLEME_SAATI} saatte bir ziyaret sayılıyor.`;
  }
}
