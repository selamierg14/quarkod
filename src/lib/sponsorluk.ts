import { haftaBaslangici } from "./gun";

/**
 * Hero banner sponsorluğu (bkz. Business.sponsorHaftasi şema yorumu).
 *
 * Saf fonksiyonlar: "bu işletme ŞU AN sponsor mu" sorusu hem admin
 * ekranında (liste satırında rozet) hem tüketici tarafında (Keşfet'in
 * hero banner seçimi) aynı kuralla cevaplanmalı.
 */

/** İki tarih aynı haftaya (aynı pazartesiye) mi denk geliyor. */
export function ayniHaftaMi(a: Date, b: Date): boolean {
  return haftaBaslangici(a).getTime() === haftaBaslangici(b).getTime();
}

/** Bir işletmenin şu an (ya da verilen tarihte) sponsor olup olmadığı. */
export function sponsorMu(sponsorHaftasi: Date | null, simdi: Date = new Date()): boolean {
  if (!sponsorHaftasi) return false;
  return ayniHaftaMi(sponsorHaftasi, simdi);
}
