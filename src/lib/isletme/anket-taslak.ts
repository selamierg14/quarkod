/**
 * Yarım kalmış anket, müşteri menüye gidip geri dönene kadar tarayıcıda
 * saklanır.
 *
 * Sunucuya yazmıyoruz: ortada henüz gönderilmiş bir geri bildirim yok ve
 * yarım bir taslak (yorum, telefon) rıza alınmadan kaydedilecek veri
 * değil. sessionStorage sekme kapanınca silinir, masadaki bir sonraki
 * müşteriye taşınmaz.
 */

export type AnketTaslak = {
  overall: number;
  kategoriler: Record<string, number>;
  /** Düşük puanlı kategoride işaretlenen sorun alanları. */
  sorunlar: Record<string, string[]>;
  secilen: string[];
  urunPuanlari: Record<string, number>;
  yorum: string;
  iletisim: string;
  iletisimTipi: string;
  riza: boolean;
  ticari: boolean;
};

export const BOS_TASLAK: AnketTaslak = {
  overall: 0,
  kategoriler: {},
  sorunlar: {},
  secilen: [],
  urunPuanlari: {},
  yorum: "",
  iletisim: "",
  iletisimTipi: "",
  riza: false,
  ticari: false,
};

export function taslakAnahtari(slug: string, tableNumber: string): string {
  return `mm-anket:${slug}:${tableNumber}`;
}

export function taslakOku(anahtar: string): AnketTaslak {
  if (typeof window === "undefined") return BOS_TASLAK;
  try {
    const ham = window.sessionStorage.getItem(anahtar);
    if (!ham) return BOS_TASLAK;
    const veri = JSON.parse(ham) as Partial<AnketTaslak>;
    // Alan alan birleştiriyoruz: eski bir taslak yeni bir alanı içermeyebilir.
    return {
      ...BOS_TASLAK,
      ...veri,
      secilen: Array.isArray(veri.secilen)
        ? veri.secilen.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return BOS_TASLAK;
  }
}

export function taslakYaz(anahtar: string, taslak: AnketTaslak): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(anahtar, JSON.stringify(taslak));
  } catch {
    // Gizli sekmede yazılamayabilir; anket yine çalışır, sadece menüye
    // gidip gelince baştan doldurulması gerekir.
  }
}

/** Menü ekranı yalnızca ürün seçimini değiştirir; gerisine dokunmaz. */
export function taslakGuncelle(anahtar: string, yama: Partial<AnketTaslak>): void {
  taslakYaz(anahtar, { ...taslakOku(anahtar), ...yama });
}

export function taslakSil(anahtar: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(anahtar);
  } catch {
    // Yoksayılır.
  }
}
