import { Platform } from "react-native";
import { renkler } from "./renkler";

/**
 * Boşluk skalası — 4'ün katları.
 *
 * Serbest sayı yazmak yerine skalaya bağlı kalmak, ekranlar arasında
 * "biri 14 diğeri 15 piksel" farkının birikip arayüzü dağıtmasını
 * engelliyor.
 */
export const bosluk = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/**
 * Köşe yarıçapları. Keskin köşe yok: en küçük eleman bile 12.
 * Kartlar 20-24, tam yuvarlak öğeler için `tam`.
 */
export const yaricap = {
  s: 12,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,
  tam: 999,
} as const;

/**
 * Gölgeler — kenarlık çizgisinin yerine geçiyor.
 *
 * iOS gerçek gölge (shadowOffset/Radius), Android yalnızca `elevation`
 * anlıyor; ikisini tek nesnede tutup platforma göre veriyoruz. Renkli
 * gölge (glow) ödül/vurgu öğelerinde kullanılıyor: rozetin altındaki
 * amber ışıma "kazanılmış" hissini kenarlık çizgisinden çok daha iyi
 * anlatıyor.
 */
export function golge(
  yukseklik: "s" | "m" | "l" = "m",
  renk: string = "#000000",
) {
  const ayar = {
    s: { yaricap: 8, opaklik: 0.24, kayma: 2, yukseltme: 2 },
    m: { yaricap: 16, opaklik: 0.32, kayma: 6, yukseltme: 6 },
    l: { yaricap: 28, opaklik: 0.4, kayma: 12, yukseltme: 12 },
  }[yukseklik];

  return Platform.select({
    ios: {
      shadowColor: renk,
      shadowOpacity: ayar.opaklik,
      shadowRadius: ayar.yaricap,
      shadowOffset: { width: 0, height: ayar.kayma },
    },
    android: { elevation: ayar.yukseltme, shadowColor: renk },
    default: {
      boxShadow: `0 ${ayar.kayma}px ${ayar.yaricap}px rgba(0,0,0,${ayar.opaklik})`,
    },
  })!;
}

/** Renkli ışıma — rozet, seviye halkası, birincil buton. */
export function isima(renk: string, guc: "yumusak" | "guclu" = "yumusak") {
  const ayar = guc === "guclu" ? { r: 24, o: 0.55 } : { r: 16, o: 0.35 };
  return Platform.select({
    ios: {
      shadowColor: renk,
      shadowOpacity: ayar.o,
      shadowRadius: ayar.r,
      shadowOffset: { width: 0, height: 0 },
    },
    android: { elevation: 8, shadowColor: renk },
    default: { boxShadow: `0 0 ${ayar.r}px ${renk}` },
  })!;
}

/**
 * Dokunma hedefi alt sınırı.
 *
 * Apple HIG 44pt, Material 48dp diyor; ikisini de karşılayan 48'i taban
 * alıyoruz. Görsel olarak daha küçük bir ikon, `hitSlop` ile bu alana
 * tamamlanıyor — küçük görünüp kolay basılabilmesi mümkün.
 */
export const DOKUNMA_ALANI = 48;

/** Alt navigasyon yüksekliği (güvenli alan hariç). */
export const SEKME_YUKSEKLIGI = 62;

export const ayirac = {
  height: 1,
  backgroundColor: renkler.cizgi,
};
