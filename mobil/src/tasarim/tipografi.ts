import { StyleSheet } from "react-native";
import { renkler } from "./renkler";

/**
 * Tipografi ölçeği — Inter.
 *
 * Hiyerarşi BOYUTLA DEĞİL, ağırlık + renkle kuruluyor: ekranda üç farklı
 * punto yerine iki punto ve üç ağırlık kullanmak, mobilde çok daha
 * sakin bir sayfa veriyor. `letterSpacing` büyük başlıklarda hafif
 * negatif (Inter'in geometrik yapısı büyük puntoda dağılıyor).
 */

export const fontlar = {
  normal: "Inter_400Regular",
  orta: "Inter_500Medium",
  yariKalin: "Inter_600SemiBold",
  kalin: "Inter_700Bold",
} as const;

export const yazi = StyleSheet.create({
  /** Ekran başlığı — "Profilim", "Keşfet". */
  ekranBasligi: {
    fontFamily: fontlar.kalin,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: renkler.metin.ana,
  },
  /** Bölüm başlığı — "Rozet vitrini". */
  bolumBasligi: {
    fontFamily: fontlar.yariKalin,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: renkler.metin.ana,
  },
  /** Kart başlığı. */
  kartBasligi: {
    fontFamily: fontlar.yariKalin,
    fontSize: 15,
    lineHeight: 20,
    color: renkler.metin.ana,
  },
  govde: {
    fontFamily: fontlar.normal,
    fontSize: 14,
    lineHeight: 20,
    color: renkler.metin.govde,
  },
  kucuk: {
    fontFamily: fontlar.normal,
    fontSize: 12,
    lineHeight: 16,
    color: renkler.metin.soluk,
  },
  /** Buton metni. */
  buton: {
    fontFamily: fontlar.yariKalin,
    fontSize: 15,
    lineHeight: 20,
    color: renkler.metin.ana,
  },
  /** Büyük sayı — puan, ziyaret sayacı. Tabular: rakam değişince zıplamaz. */
  sayi: {
    fontFamily: fontlar.kalin,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: renkler.metin.ana,
    fontVariant: ["tabular-nums" as const],
  },
  /** Etiket — büyük harf, geniş harf aralığı. */
  etiket: {
    fontFamily: fontlar.orta,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    color: renkler.metin.soluk,
  },
});
