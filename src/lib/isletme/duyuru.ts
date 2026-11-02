import { gunBaslangici, gunEkle } from "@/lib/cekirdek/gun";

type DuyuruTarihleri = { aktif: boolean; baslangic: Date | null; bitis: Date | null };

/**
 * Duyurunun panelde gösterilen durumu.
 *
 * Önceden panel yalnızca `aktif` alanına bakıp "Yayında" yazıyordu: bitiş
 * tarihi geçmiş bir duyuru da yeşil "Yayında" görünüyordu, oysa müşteri
 * onu çoktan görmüyordu (QA, Ekim 2026). Panel ile müşteri ekranı aynı
 * kuralı kullanmalı — bu fonksiyon o kural.
 */
export type DuyuruDurumu = "yayinda" | "planlandi" | "suresi-doldu" | "pasif";

/**
 * Tarihler GÜN olarak yorumlanıyor ve bitiş günü DAHİL.
 *
 * Formdaki "Bitiş: 5 Ocak" kullanıcı için "5 Ocak'ın sonuna kadar"
 * demek. Önceden bitiş anı olduğu gibi karşılaştırılıyordu; tarih
 * `new Date("2026-01-05")` ile UTC gece yarısı saklandığı için duyuru son
 * gününün 03:00'ünde kayboluyordu.
 */
export function duyuruDurumu(duyuru: DuyuruTarihleri, simdi: Date = new Date()): DuyuruDurumu {
  if (duyuru.bitis && gunEkle(gunBaslangici(duyuru.bitis), 1) <= simdi) return "suresi-doldu";
  if (!duyuru.aktif) return "pasif";
  if (duyuru.baslangic && gunBaslangici(duyuru.baslangic) > simdi) return "planlandi";
  return "yayinda";
}

/** Bir duyurunun şu an müşteriye gösterilip gösterilmeyeceği. */
export function duyuruAktifMi(duyuru: DuyuruTarihleri, simdi: Date = new Date()): boolean {
  return duyuruDurumu(duyuru, simdi) === "yayinda";
}

export const DUYURU_DURUM_METNI: Record<DuyuruDurumu, string> = {
  yayinda: "Yayında",
  planlandi: "Planlandı",
  "suresi-doldu": "Süresi doldu",
  pasif: "Pasif",
};

/**
 * Yeni ya da düzenlenen duyurunun tarihleri mantıklı mı. Bitişi geçmişte
 * kalan bir duyuru hiçbir zaman görünmeyecek; kaydetmek yerine söylüyoruz.
 */
export function duyuruTarihHatasi(
  baslangic: Date | null,
  bitis: Date | null,
  simdi: Date = new Date(),
  /** Düzenlemede bitiş değişmediyse false: yalnızca metni düzelten zorlanmasın. */
  gecmisBitisiDenetle = true,
): string | null {
  if (baslangic && bitis && gunBaslangici(baslangic) > gunBaslangici(bitis)) {
    return "Başlangıç, bitişten sonra olamaz.";
  }
  if (gecmisBitisiDenetle && bitis && gunEkle(gunBaslangici(bitis), 1) <= simdi) {
    return "Bitiş tarihi geçmişte kalmış; bu duyuru müşteriye hiç görünmez.";
  }
  return null;
}
