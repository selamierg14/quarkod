/**
 * Mekanın haritadaki yeri ve keşfet ekranında süzülmesini sağlayan
 * özellikleri.
 *
 * Bu bilgilerin tek tüketicisi Quarkod paneli değil: Biyerlere mobil
 * uygulaması işletmeleri haritada göstermek ve filtrelemek için buradaki
 * alanları okuyor. Next'e bağımlılığı yok — kurallar saf fonksiyon olarak
 * testlenebilir halde duruyor.
 */

/**
 * Keşfet ekranındaki mekan özellikleri.
 *
 * Serbest metin değil sabit liste: "priz var" ile "Priz" ayrı etiket
 * olsaydı filtre ikisini birden yakalayamazdı. Menü etiketleriyle
 * (MENU_TAGS) aynı gerekçe, ama bunlar ÜRÜNÜN değil MEKANIN özelliği.
 */
export const MEKAN_OZELLIKLERI = {
  priz: "Priz / laptop uygun",
  bahce: "Bahçe / teras",
  petFriendly: "Evcil hayvan dostu",
  nargile: "Nargile / lounge",
  wifi: "Yüksek hızlı Wi-Fi",
  otopark: "Otopark / vale",
  canliMuzik: "Canlı müzik sahnesi",
  macYayini: "Maç yayını",
} as const;

export type MekanOzelligi = keyof typeof MEKAN_OZELLIKLERI;

export const MEKAN_OZELLIK_ANAHTARLARI = Object.keys(
  MEKAN_OZELLIKLERI,
) as MekanOzelligi[];

export function gecerliOzellikMi(deger: string): deger is MekanOzelligi {
  return deger in MEKAN_OZELLIKLERI;
}

export function ozellikleriCoz(ham: string | null | undefined): MekanOzelligi[] {
  if (!ham) return [];
  const kume = new Set<MekanOzelligi>();
  for (const parca of ham.split(",")) {
    const t = parca.trim();
    if (gecerliOzellikMi(t)) kume.add(t);
  }
  return [...kume];
}

export function ozellikleriYaz(degerler: string[]): string | null {
  const gecerli = degerler.map((d) => d.trim()).filter(gecerliOzellikMi);
  return gecerli.length ? [...new Set(gecerli)].join(",") : null;
}

/**
 * Bütçe segmenti. Fiyat aralığı (₺100-200 gibi) yerine sembol: menü
 * fiyatları zaten sistemde ve sürekli değişiyor, sabit bir aralık kısa
 * sürede yalan olurdu. Sembol ise mekanın konumlandırmasını anlatıyor.
 */
export const FIYAT_SEGMENTLERI = {
  ucuz: "₺ · Ekonomik",
  orta: "₺₺ · Orta",
  pahali: "₺₺₺ · Premium",
} as const;

export type FiyatSegmenti = keyof typeof FIYAT_SEGMENTLERI;

export function gecerliSegmentMi(deger: string): deger is FiyatSegmenti {
  return deger in FIYAT_SEGMENTLERI;
}

/** Enlem/boylam çifti; ikisi birden dolu ya da ikisi birden boş olur. */
export type Koordinat = { enlem: number; boylam: number };

/**
 * Koordinatın dünya üzerinde geçerli bir noktaya karşılık gelip
 * gelmediği.
 *
 * (0, 0) ayrıca eleniyor: Gine Körfezi'ndeki bu nokta gerçek bir yer ama
 * pratikte her zaman "alan boş bırakıldı / ayrıştırma başarısız" demek.
 * Haritada Afrika açıklarında yüzen bir kafe göstermektense hiç
 * göstermemek daha doğru.
 */
export function gecerliKoordinatMi(enlem: number, boylam: number): boolean {
  if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) return false;
  if (enlem === 0 && boylam === 0) return false;
  return enlem >= -90 && enlem <= 90 && boylam >= -180 && boylam <= 180;
}

/**
 * Google Haritalar bağlantısından koordinat çıkarır.
 *
 * İşletmeye enlem/boylam yazdırmak kötü bir deneyim: çoğu kafe sahibi bu
 * sayıları nereden bulacağını bilmiyor. Oysa Google yorum linkini zaten
 * panele yapıştırıyorlar (bkz. işletme ayarları) ve o linkin içinde
 * koordinat gömülü geliyor.
 *
 * İki biçim var ve sıra önemli:
 *  - `!3d<enlem>!4d<boylam>` → İŞLETMENİN kendi konumu. Tercih edilen.
 *  - `@<enlem>,<boylam>,17z` → haritanın o anki GÖRÜNTÜ merkezi; kullanıcı
 *    kaydırmışsa işletmeden yüzlerce metre sapabilir, bu yüzden yedek.
 *
 * Ayrıştırılamazsa null: yanlış bir koordinat, koordinatsızlıktan kötü —
 * müşteriyi yanlış sokağa yollar.
 */
export function googleLinkindenKoordinat(
  url: string | null | undefined,
): Koordinat | null {
  if (!url) return null;

  const yerEslesme = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const gorunumEslesme = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const eslesme = yerEslesme ?? gorunumEslesme;
  if (!eslesme) return null;

  const enlem = Number(eslesme[1]);
  const boylam = Number(eslesme[2]);
  return gecerliKoordinatMi(enlem, boylam) ? { enlem, boylam } : null;
}

/**
 * Formdan gelen serbest metni koordinata çevirir.
 *
 * Hem düz sayı ("40.8715") hem de tam bir Google bağlantısı kabul
 * ediliyor: kullanıcı hangisini yapıştırırsa yapıştırsın çalışsın.
 *
 * Dönüş üç halli — `null` "alan boş bırakıldı" (geçerli bir tercih),
 * `undefined` ise "bir şey yazılmış ama okunamadı" demek; ikincisinde
 * form hata göstermeli, sessizce boşa düşürüp kullanıcının girdiğini
 * sandığı konumu kaybetmemeli.
 */
export function koordinatCoz(
  enlemHam: string,
  boylamHam: string,
): Koordinat | null | undefined {
  const enlemMetin = enlemHam.trim();
  const boylamMetin = boylamHam.trim();

  if (!enlemMetin && !boylamMetin) return null;
  // Tek başına enlem ya da tek başına boylam bir yer tarif etmiyor.
  if (!enlemMetin || !boylamMetin) return undefined;

  const enlem = Number(enlemMetin.replace(",", "."));
  const boylam = Number(boylamMetin.replace(",", "."));
  return gecerliKoordinatMi(enlem, boylam) ? { enlem, boylam } : undefined;
}

/**
 * İki nokta arasındaki kuş uçuşu mesafe (metre) — Haversine.
 *
 * İki yerde kullanılıyor: keşfet ekranında "450 m uzakta" etiketi ve
 * masada QR okutan kişinin gerçekten mekanda olup olmadığının
 * doğrulanması (sahte yorum engeli). İkincisi yüzünden saf ve testlenebilir
 * tutuldu — bir hata doğrudan "gerçek müşteri puan veremiyor" ya da
 * "evinden puan verilebiliyor" demek.
 */
export function mesafeMetre(a: Koordinat, b: Koordinat): number {
  const DUNYA_YARICAPI = 6_371_000;
  const rad = (derece: number) => (derece * Math.PI) / 180;

  const dEnlem = rad(b.enlem - a.enlem);
  const dBoylam = rad(b.boylam - a.boylam);
  const h =
    Math.sin(dEnlem / 2) ** 2 +
    Math.cos(rad(a.enlem)) * Math.cos(rad(b.enlem)) * Math.sin(dBoylam / 2) ** 2;

  return Math.round(2 * DUNYA_YARICAPI * Math.asin(Math.sqrt(h)));
}
