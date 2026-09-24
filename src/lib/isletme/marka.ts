import type { CSSProperties } from "react";

/**
 * İşletme markasının arayüze enjeksiyonu.
 *
 * Beyaz etiket kurulumda renk bizden değil müşteriden geliyor; sarı bir
 * kafe rengi üstüne beyaz yazı yazarsak ekran okunmaz hale gelir. Bu yüzden
 * marka rengiyle birlikte üstüne yazılacak mürekkep rengini de hesaplayıp
 * CSS değişkeni olarak veriyoruz.
 */

const VARSAYILAN = "#0f766e";

/** #abc / #aabbcc → [r,g,b]; geçersizse null. */
function hexToRgb(hex: string): [number, number, number] | null {
  const t = hex.trim().replace(/^#/, "");
  const tam =
    t.length === 3
      ? t
          .split("")
          .map((c) => c + c)
          .join("")
      : t;
  if (!/^[0-9a-fA-F]{6}$/.test(tam)) return null;
  return [
    parseInt(tam.slice(0, 2), 16),
    parseInt(tam.slice(2, 4), 16),
    parseInt(tam.slice(4, 6), 16),
  ];
}

/** WCAG bağıl parlaklık. */
function parlaklik(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function gecerliMarkaRengi(hex: string | null | undefined): string {
  return hex && hexToRgb(hex) ? hex.trim() : VARSAYILAN;
}

/**
 * Marka rengi üstündeki metin/ikon rengi.
 *
 * Eşik 0.55: sarı-turuncu tonlarda beyaz yazı okunmuyor, koyu mürekkep
 * hem kontrastı hem markanın kendi rengini koruyor.
 */
export function markaMurekkebi(hex: string | null | undefined): string {
  const rgb = hexToRgb(gecerliMarkaRengi(hex));
  if (!rgb) return "#ffffff";
  return parlaklik(rgb) > 0.55 ? "#1a2230" : "#ffffff";
}

/**
 * Bir kapsayıcıya verilecek marka değişkenleri.
 *
 * `data-marka` özniteliğiyle birlikte kullanılır; türev tonlar (soft, line)
 * globals.css içinde color-mix ile bundan hesaplanır.
 */
export function markaStili(hex: string | null | undefined): CSSProperties {
  const renk = gecerliMarkaRengi(hex);
  return {
    "--brand": renk,
    "--brand-ink": markaMurekkebi(renk),
  } as CSSProperties;
}
