/**
 * QR menü: etiketler, fiyat biçimi ve ürün puanı yardımcıları.
 *
 * Next'e bağımlılığı yok; kurallar burada testlenebilir hâlde duruyor.
 */

/**
 * Diyet ve alerjen etiketleri.
 *
 * Serbest metin değil sabit liste: "glutensiz" ile "Glutensiz" ayrı etiket
 * olsaydı müşteri filtrelemesi de raporlama da bozulurdu. Alerjen bilgisi
 * yanlış olduğunda sonucu ağır olabildiği için tahmine yer bırakmıyoruz.
 */
export const MENU_TAGS = {
  vegan: "Vegan",
  vejetaryen: "Vejetaryen",
  glutensiz: "Glutensiz",
  laktozsuz: "Laktozsuz",
  aci: "Acı",
  yeni: "Yeni",
  populer: "Popüler",
} as const;

export type MenuTag = keyof typeof MENU_TAGS;

export function isMenuTag(value: string): value is MenuTag {
  return value in MENU_TAGS;
}

/** Virgülle ayrılmış etiket metnini geçerli etiketlere çevirir. */
export function parseTags(raw: string | null | undefined): MenuTag[] {
  if (!raw) return [];
  const seen = new Set<MenuTag>();
  for (const parca of raw.split(",")) {
    const t = parca.trim().toLowerCase();
    if (isMenuTag(t)) seen.add(t);
  }
  return [...seen];
}

/** Etiket listesini saklanacak biçime çevirir; boşsa null. */
export function serializeTags(tags: string[]): string | null {
  const gecerli = tags.map((t) => t.trim().toLowerCase()).filter(isMenuTag);
  return gecerli.length ? [...new Set(gecerli)].join(",") : null;
}

/**
 * Fiyatı kuruş cinsinden tam sayıya çevirir.
 *
 * Ondalıklı sayı yerine kuruş: 19.90 gibi değerler ikili gösterimde tam
 * durmaz ve toplamlarda kuruş sapmaları birikir. Menüde 1 kuruşluk sapma
 * bile müşterinin güvenini sarsar.
 *
 * Geçersiz girdide undefined, boş girdide null döner.
 */
export function parsePrice(raw: string): number | null | undefined {
  const v = raw.trim().replace(/\s|₺|TL/gi, "");
  if (!v) return null;

  // Türkçe yazımda ondalık ayırıcı virgül: "19,90".
  const normalize = v.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalize)) return undefined;

  const sayi = Number(normalize);
  if (!Number.isFinite(sayi) || sayi < 0 || sayi > 100000) return undefined;
  return Math.round(sayi * 100);
}

/** Kuruşu "₺149,90" biçiminde gösterir. */
export function formatPrice(kurus: number | null | undefined): string {
  if (kurus === null || kurus === undefined) return "";
  return `₺${(kurus / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Fiyat girdisini forma geri yazarken kullanılan biçim ("149,90"). */
export function priceInputValue(kurus: number | null | undefined): string {
  if (kurus === null || kurus === undefined) return "";
  return (kurus / 100).toFixed(2).replace(".", ",");
}

/**
 * Bir ürünün "en iyi/en kötü" listesinde yer alabilmesi için gereken en az
 * oy sayısı.
 *
 * Tek bir kızgın müşterinin oyuyla bir ürünü "ayın en kötüsü" ilan etmek,
 * işletmeyi yanlış yere baktırır. Az oylu ürünler listelenir ama ayrı
 * işaretlenir; gizlemek de yanlış olurdu, yeni ürünün ilk tepkisi değerli.
 */
export const GUVENILIR_OY_SINIRI = 5;

export type UrunPuani = {
  menuItemId: string | null;
  itemName: string;
  oySayisi: number;
  ortalama: number;
  /** Oy sayısı eşiğin altındaysa true — yorumlarken dikkat gerekir. */
  azVeri: boolean;
};

export type HamPuan = { menuItemId: string | null; itemName: string; rating: number };

/** Ham puanları ürün bazında toplar; ortalamaya göre büyükten küçüğe sıralar. */
export function urunPuanlari(satirlar: HamPuan[]): UrunPuani[] {
  // Ürün silinmiş olabilir (menuItemId null); o zaman ada göre grupluyoruz ki
  // "Latte" kaydı, ürün silinse bile tek satır olarak görünsün.
  const gruplar = new Map<string, { ad: string; id: string | null; toplam: number; adet: number }>();

  for (const satir of satirlar) {
    if (!Number.isInteger(satir.rating) || satir.rating < 1 || satir.rating > 5) continue;
    const anahtar = satir.menuItemId ?? `ad:${satir.itemName.toLocaleLowerCase("tr")}`;
    const mevcut = gruplar.get(anahtar);
    if (mevcut) {
      mevcut.toplam += satir.rating;
      mevcut.adet += 1;
    } else {
      gruplar.set(anahtar, {
        ad: satir.itemName,
        id: satir.menuItemId,
        toplam: satir.rating,
        adet: 1,
      });
    }
  }

  return [...gruplar.values()]
    .map((g) => ({
      menuItemId: g.id,
      itemName: g.ad,
      oySayisi: g.adet,
      ortalama: Math.round((g.toplam / g.adet) * 10) / 10,
      azVeri: g.adet < GUVENILIR_OY_SINIRI,
    }))
    .sort((a, b) => b.ortalama - a.ortalama || b.oySayisi - a.oySayisi);
}

/**
 * Rapor için en iyi ve en kötü ürünler.
 *
 * Yalnızca yeterli oyu olanlar arasından seçilir: "3 oyla 1.0 alan tatlı"
 * gerçek bir sorun olmayabilir, ama işletmeyi oraya koşturur.
 */
export function enIyiEnKotu(
  puanlar: UrunPuani[],
  adet = 3,
): { enIyi: UrunPuani[]; enKotu: UrunPuani[] } {
  const guvenilir = puanlar.filter((p) => !p.azVeri);
  return {
    enIyi: guvenilir.slice(0, adet),
    enKotu: [...guvenilir].reverse().slice(0, adet),
  };
}

/**
 * Menüde bildirilmesi zorunlu majör alerjenler.
 *
 * Serbest metin DEĞİL sabit liste — etiketlerle aynı gerekçe, ama burada
 * bahis daha yüksek: "fındık" yazan bir işletme ile "Fındık" yazan başka
 * bir işletme, alerjik bir müşteri için aynı bilgiyi taşımalı ve filtre
 * ikisini de yakalamalı. Yanlış ya da eksik bir alerjen bildiriminin
 * sonucu geri alınamaz.
 *
 * Liste, gıda etiketlemesinde yerleşik olan on dört majör alerjen. Ürünün
 * hangi alerjeni içerdiğini işletme işaretliyor; sistem tahmin etmiyor.
 */
export const ALERJENLER = {
  gluten: "Gluten",
  kabuklu: "Kabuklu deniz ürünleri",
  yumurta: "Yumurta",
  balik: "Balık",
  yerfistigi: "Yer fıstığı",
  soya: "Soya",
  sut: "Süt",
  sertkabuklu: "Sert kabuklu meyveler (fındık, ceviz, badem…)",
  kereviz: "Kereviz",
  hardal: "Hardal",
  susam: "Susam",
  sulfit: "Sülfit",
  acibakla: "Acı bakla",
  yumusakca: "Yumuşakçalar",
} as const;

export type Alerjen = keyof typeof ALERJENLER;

export function isAlerjen(value: string): value is Alerjen {
  return value in ALERJENLER;
}

export function parseAlerjenler(raw: string | null | undefined): Alerjen[] {
  if (!raw) return [];
  const seen = new Set<Alerjen>();
  for (const parca of raw.split(",")) {
    const t = parca.trim().toLowerCase();
    if (isAlerjen(t)) seen.add(t);
  }
  return [...seen];
}

export function serializeAlerjenler(deger: string[]): string | null {
  const gecerli = deger.map((t) => t.trim().toLowerCase()).filter(isAlerjen);
  return gecerli.length ? [...new Set(gecerli)].join(",") : null;
}

/**
 * Ayrıca beyan edilmesi gereken özel bileşenler.
 *
 * Alerjenden ayrı tutuluyor çünkü sebebi de farklı: bunlar sağlık değil
 * inanç ve tercih kaynaklı kısıtlar. Aynı listede olsalardı "alerjenim
 * yok" diyen bir filtre bunları da eleyip yanlış sonuç verirdi.
 */
export const OZEL_BILESENLER = {
  alkol: "Alkol içerir",
  domuz: "Domuz türevi katkı içerir",
} as const;

export type OzelBilesen = keyof typeof OZEL_BILESENLER;

export function isOzelBilesen(value: string): value is OzelBilesen {
  return value in OZEL_BILESENLER;
}

export function parseOzelBilesenler(raw: string | null | undefined): OzelBilesen[] {
  if (!raw) return [];
  const seen = new Set<OzelBilesen>();
  for (const parca of raw.split(",")) {
    const t = parca.trim().toLowerCase();
    if (isOzelBilesen(t)) seen.add(t);
  }
  return [...seen];
}

export function serializeOzelBilesenler(deger: string[]): string | null {
  const gecerli = deger.map((t) => t.trim().toLowerCase()).filter(isOzelBilesen);
  return gecerli.length ? [...new Set(gecerli)].join(",") : null;
}

/**
 * Kalori girdisini tam sayıya çevirir.
 *
 * Boş bırakılabiliyor: bir işletme bütün menüsünün kalorisini bir günde
 * giremez, kısmi doldurmaya izin vermezsek hiç doldurmaz. Eksik olanı
 * panelde sayıyoruz (bkz. menu/page.tsx) ki tamamlanacak iş görünür kalsın.
 *
 * Negatif ya da anlamsız büyük değerler eleniyor: 100 gramda 9 kcal'den
 * yoğun bir gıda yok, tek porsiyon için 20.000 üst sınırı fazlasıyla geniş.
 */
export function parseKalori(raw: string): number | null | undefined {
  const temiz = raw.trim();
  if (!temiz) return null;
  const sayi = Number(temiz.replace(",", "."));
  if (!Number.isFinite(sayi)) return undefined;
  const tam = Math.round(sayi);
  if (tam < 0 || tam > 20000) return undefined;
  return tam;
}
