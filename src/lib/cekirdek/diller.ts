/**
 * Müşteri ekranlarının dil katmanı.
 *
 * Turistik mekanlarda QR'ı okutan kişinin Türkçe bilmeme ihtimali yüksek;
 * anlamadığı bir anketi kimse doldurmaz. Panel tarafı çevrilmiyor — orayı
 * işletme personeli kullanıyor ve tek dil yeterli.
 *
 * Kapsam: arayüz metinleri. Ürün adları, açıklamaları ve duyuru gibi
 * işletmenin kendi yazdığı içerikler yazıldığı dilde kalır; onları makine
 * çevirisine sokmak "Kayseri Mantısı"nı "Kayseri Dumpling"e çevirip menüyü
 * güvenilmez yapardı.
 */

export const DILLER = {
  tr: { ad: "Türkçe", kisa: "TR", yon: "ltr" },
  en: { ad: "English", kisa: "EN", yon: "ltr" },
  ar: { ad: "العربية", kisa: "AR", yon: "rtl" },
  ru: { ad: "Русский", kisa: "RU", yon: "ltr" },
} as const;

export type Dil = keyof typeof DILLER;

export const DIL_LISTESI = Object.keys(DILLER) as Dil[];

/** Sunucunun çizdiği dil. Değiştirilirse hidrasyon uyuşmazlığı çıkar. */
export const VARSAYILAN_DIL: Dil = "tr";

export function gecerliDilMi(deger: string): deger is Dil {
  return deger in DILLER;
}

export function dilYonu(dil: Dil): "ltr" | "rtl" {
  return DILLER[dil].yon;
}

/**
 * Tarayıcının dil tercihlerinden desteklediğimiz ilkini seçer.
 *
 * "en-GB" gibi bölgeli kodlar da eşleşmeli; ilk iki harfe bakıyoruz.
 * Hiçbiri tutmuyorsa Türkçe kalır — mekân Türkiye'de.
 */
export function dilAlgila(tercihler: readonly string[]): Dil {
  for (const tercih of tercihler) {
    const kok = tercih.slice(0, 2).toLowerCase();
    if (gecerliDilMi(kok)) return kok;
  }
  return VARSAYILAN_DIL;
}
