import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";

/**
 * Panelin yazı tipleri — yalnızca /admin altında yükleniyor.
 *
 * Müşteri ekranları (QR sayfası, Biyerlere) kök düzendeki Geist'i
 * kullanmaya devam ediyor; bu üçü onların sayfa ağırlığına eklenmiyor.
 *
 *   - Bricolage Grotesque: başlıklar ve büyük rakamlar (karakterli grotesk)
 *   - Figtree: gövde metni
 *   - IBM Plex Mono: saat, masa, puan gibi alt alta hizalanan veriler
 *
 * `latin-ext`: ğ, ş, ı, İ için şart — yalnızca `latin` ile Türkçe harfler
 * yedek yazı tipine düşüyordu.
 */
export const panelBaslik = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-panel-display",
  display: "swap",
});

export const panelGovde = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-panel-sans",
  display: "swap",
});

export const panelMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-panel-mono",
  display: "swap",
});

/** Panel kabuğunun kök öğesine: değişkenler + tema kapsamı. */
export const PANEL_FONT_SINIFI = `${panelBaslik.variable} ${panelGovde.variable} ${panelMono.variable}`;
