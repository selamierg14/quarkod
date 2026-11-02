/**
 * Google yorum linkinin kullanılabilir olup olmadığı.
 *
 * Ürünün en değerli anı, müşterinin 5 yıldız verdiği saniyedir: o an
 * Google'a yönlendiriliyor. Link bozuksa o an geri gelmemek üzere ziyan
 * oluyor ve kimse fark etmiyor — müşteri boş bir Google sayfası görüp
 * kapatıyor, panelde hiçbir uyarı çıkmıyor.
 *
 * Canlıda ölçüldü: iki işletmenin linki kurulum sırasında bırakılan
 * `?placeid=DEGISTIRIN` yer tutucusuydu. `Boolean(url)` kontrolü bunu
 * geçerli sayıyordu. Artık "dolu mu" değil "işe yarar mı" diye soruyoruz.
 */

/** Kurulum şablonlarından kalan, doldurulmamış değerler. */
const YER_TUTUCULAR = [
  "degistirin",
  "değiştirin",
  "buraya",
  "placeid=xxx",
  "place_id=xxx",
  "ornek",
  "example",
  "yourplaceid",
  "your-place-id",
  "todo",
];

export function googleYorumLinkiGecerliMi(url: string | null | undefined): boolean {
  if (!url) return false;

  let adres: URL;
  try {
    adres = new URL(url.trim());
  } catch {
    return false;
  }

  if (adres.protocol !== "https:" && adres.protocol !== "http:") return false;

  // Google dışı bir adrese "yorum bırak" diye göndermek istemiyoruz.
  const host = adres.hostname.toLowerCase();
  const googleMi =
    host === "g.page" ||
    host === "goo.gl" ||
    host.endsWith(".google.com") ||
    host.endsWith(".google.com.tr") ||
    host === "google.com" ||
    host === "google.com.tr";
  if (!googleMi) return false;

  const tam = url.toLowerCase();
  if (YER_TUTUCULAR.some((iz) => tam.includes(iz))) return false;

  // "?placeid=" var ama değeri boşsa link çalışmaz.
  const placeId =
    adres.searchParams.get("placeid") ?? adres.searchParams.get("place_id");
  if (placeId !== null && placeId.trim().length < 5) return false;

  return true;
}

/** Panelde gösterilecek kısa açıklama; geçerliyse null. */
export function googleYorumLinkiSorunu(url: string | null | undefined): string | null {
  if (!url) return "Google yorum linki yok — 5 yıldız yönlendirmesi çalışmaz.";
  if (!googleYorumLinkiGecerliMi(url)) {
    return "Google yorum linki geçersiz görünüyor — 5 yıldız verenler boş bir sayfaya gidiyor.";
  }
  return null;
}
