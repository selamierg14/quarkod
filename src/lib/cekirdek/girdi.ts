/**
 * Girdi doğrulama — tek kaynak.
 *
 * Proje boyunca aynı üç satır tekrar ediyordu:
 *
 *     const n = Number(formData.get("kisiSayisi") ?? 0);
 *     if (!Number.isFinite(n) || n < 1) return { error: "..." };
 *
 * ...ve ÜST SINIR çoğu yerde unutuluyordu. Alt sınırı yazıp üst sınırı
 * atlamak sessiz bir hata sınıfı üretiyor: `kisiSayisi: 999999999` kabul
 * edilip veritabanına yazılıyor, metin alanları megabaytlarca veri
 * alabiliyor, bir liste on bin eleman taşıyıp arkasındaki döngüyü on bin
 * sorguya çeviriyor.
 *
 * Buradaki yardımcılar SAF ve `FormData`/JSON ayrımından bağımsız: ikisi de
 * `unknown` alıp aynı kurallardan geçiyor. Böylece bir alanın sınırı Server
 * Action'da ve API rotasında farklı olamıyor.
 *
 * Tasarım kararı: fırlatmıyorlar, `{ deger }` ya da `{ hata }` döndürüyorlar.
 * İstisna, çağıran her yerde try/catch ister ve unutulduğunda 500'e düşer;
 * ayrık birlik (discriminated union) TypeScript'in unutturmamasını sağlıyor.
 */

export type Dogrulama<T> = { ok: true; deger: T } | { ok: false; hata: string };

const enUzun = (metin: string, sinir: number) =>
  metin.length > sinir ? `${metin.slice(0, sinir)}` : metin;

/**
 * Metin alanı.
 *
 * `kirp` varsayılan olarak açık: sınırı aşan metni reddetmek yerine
 * kesmek, kullanıcıyı "notunuz 501 karakter" diye geri çevirmekten daha
 * iyi bir deneyim. Kimlik/kod gibi alanlarda `kirp: false` verilip
 * reddedilmeli — orada sessiz kesme yanlış kayda yazar.
 */
export function metinAlani(
  ham: unknown,
  ad: string,
  {
    enAz = 0,
    enCok = 200,
    kirp = true,
    zorunlu = enAz > 0,
  }: { enAz?: number; enCok?: number; kirp?: boolean; zorunlu?: boolean } = {},
): Dogrulama<string> {
  const metin = typeof ham === "string" ? ham.trim() : "";

  if (!metin) {
    return zorunlu ? { ok: false, hata: `${ad} gerekli.` } : { ok: true, deger: "" };
  }
  if (metin.length < enAz) {
    return { ok: false, hata: `${ad} en az ${enAz} karakter olmalı.` };
  }
  if (metin.length > enCok) {
    if (!kirp) return { ok: false, hata: `${ad} en fazla ${enCok} karakter olabilir.` };
    return { ok: true, deger: enUzun(metin, enCok) };
  }
  return { ok: true, deger: metin };
}

/**
 * Tam sayı alanı — alt VE üst sınır zorunlu.
 *
 * İkisinin de zorunlu olması bilinçli: üst sınırı isteğe bağlı bıraksaydım
 * yine unutulurdu. Sınır düşünmek zorunda kalmak, buradaki asıl kazanç.
 */
export function sayiAlani(
  ham: unknown,
  ad: string,
  { enAz, enCok, varsayilan }: { enAz: number; enCok: number; varsayilan?: number },
): Dogrulama<number> {
  if ((ham === undefined || ham === null || ham === "") && varsayilan !== undefined) {
    return { ok: true, deger: varsayilan };
  }

  const sayi = typeof ham === "number" ? ham : Number(String(ham ?? "").trim());
  if (!Number.isFinite(sayi)) {
    return { ok: false, hata: `${ad} sayı olmalı.` };
  }
  if (!Number.isInteger(sayi)) {
    return { ok: false, hata: `${ad} tam sayı olmalı.` };
  }
  if (sayi < enAz || sayi > enCok) {
    return { ok: false, hata: `${ad} ${enAz}-${enCok} arasında olmalı.` };
  }
  return { ok: true, deger: sayi };
}

/**
 * Liste alanı — eleman sayısı SINIRLI.
 *
 * Asıl gerekçe performans ve dayanıklılık: arkasındaki kod genelde her
 * eleman için bir doğrulama ya da veritabanı işlemi yapıyor. Sınırsız bir
 * liste, tek bir isteği binlerce sorguya çeviren en ucuz yol.
 *
 * Tekrarlar ayıklanıyor: aynı kimliği iki kez göndermek hem gereksiz iş
 * hem de "iki masa seçildi" gibi yanlış sayımlar üretiyordu.
 */
export function listeAlani(
  ham: unknown[],
  ad: string,
  { enAz = 0, enCok }: { enAz?: number; enCok: number },
): Dogrulama<string[]> {
  const temiz = [
    ...new Set(
      ham
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter((d) => d.length > 0 && d.length <= 100),
    ),
  ];

  if (temiz.length < enAz) {
    return { ok: false, hata: `${ad} için en az ${enAz} seçim gerekli.` };
  }
  if (temiz.length > enCok) {
    return { ok: false, hata: `${ad} için en fazla ${enCok} seçim yapılabilir.` };
  }
  return { ok: true, deger: temiz };
}

/**
 * Sabit bir kümeden değer — "enum'a bağla" kuralının uygulanışı.
 *
 * Serbest metin yerine sabit liste: `sekil` alanına "kare"/"yuvarlak"
 * dışında bir şey yazılırsa veritabanında sessizce durur ve arayüz onu
 * çizemez. Tanınmayan değerde varsayılana düşüyoruz çünkü bu alanlar
 * genelde görsel bir tercih — kullanıcıyı hata ekranıyla durdurmanın
 * karşılığı yok. Kimlik/rol gibi güvenlik taşıyan alanlarda
 * `varsayilan` verilmemeli, o zaman fonksiyon hata döndürür.
 */
export function secenekAlani<const T extends readonly string[]>(
  ham: unknown,
  ad: string,
  secenekler: T,
  varsayilan?: T[number],
): Dogrulama<T[number]> {
  const metin = typeof ham === "string" ? ham.trim() : "";
  if (secenekler.includes(metin)) return { ok: true, deger: metin as T[number] };
  if (varsayilan !== undefined) return { ok: true, deger: varsayilan };
  return { ok: false, hata: `${ad} geçersiz.` };
}

/**
 * Tarih alanı — geçerlilik VE makul bir pencere.
 *
 * Sadece `isNaN` bakmak yetmiyor: 1970 ya da 3000 yılına rezervasyon
 * girilmesi teknik olarak geçerli bir tarih ama iş açısından hata.
 */
export function tarihAlani(
  ham: unknown,
  ad: string,
  { enGeriGun = 365, enIleriGun = 365 }: { enGeriGun?: number; enIleriGun?: number } = {},
): Dogrulama<Date> {
  const tarih = new Date(typeof ham === "string" || ham instanceof Date ? (ham as string) : "");
  if (Number.isNaN(tarih.getTime())) {
    return { ok: false, hata: `${ad} geçersiz.` };
  }
  const simdi = Date.now();
  const gun = 24 * 60 * 60 * 1000;
  if (tarih.getTime() < simdi - enGeriGun * gun) {
    return { ok: false, hata: `${ad} çok eski.` };
  }
  if (tarih.getTime() > simdi + enIleriGun * gun) {
    return { ok: false, hata: `${ad} çok ileri bir tarih.` };
  }
  return { ok: true, deger: tarih };
}

/**
 * Birden çok doğrulamanın ilk hatasını döndürür.
 *
 * Çağıran tarafta her alan için ayrı `if (!x.ok) return` yazmak yerine
 * tek satır: `const hata = ilkHata(a, b, c); if (hata) return { error: hata };`
 */
export function ilkHata(...sonuclar: Dogrulama<unknown>[]): string | null {
  for (const s of sonuclar) if (!s.ok) return s.hata;
  return null;
}
