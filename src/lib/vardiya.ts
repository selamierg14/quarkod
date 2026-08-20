import { SHIFTS, type Shift } from "./constants";

/** Business modelindeki vardiya ayarlarının ortak alt kümesi. */
export type VardiyaAyarlari = {
  vardiyaSabahAktif: boolean;
  vardiyaSabahSaat: string;
  vardiyaOgleAktif: boolean;
  vardiyaOgleSaat: string;
  vardiyaAksamAktif: boolean;
  vardiyaAksamSaat: string;
  vardiyaGeceAktif: boolean;
  vardiyaGeceSaat: string;
};

const ALANLAR: { shift: Shift; aktif: keyof VardiyaAyarlari; saat: keyof VardiyaAyarlari }[] = [
  { shift: "sabah", aktif: "vardiyaSabahAktif", saat: "vardiyaSabahSaat" },
  { shift: "ogle", aktif: "vardiyaOgleAktif", saat: "vardiyaOgleSaat" },
  { shift: "aksam", aktif: "vardiyaAksamAktif", saat: "vardiyaAksamSaat" },
  { shift: "gece", aktif: "vardiyaGeceAktif", saat: "vardiyaGeceSaat" },
];

function saatToDakika(saat: string): number {
  const [s, d] = saat.split(":").map((n) => Number(n) || 0);
  return s * 60 + d;
}

/** İşletmenin etkin vardiyaları, SHIFTS sırasıyla. */
export function etkinVardiyalar(ayarlar: VardiyaAyarlari): Shift[] {
  return ALANLAR.filter((a) => ayarlar[a.aktif]).map((a) => a.shift);
}

/**
 * Bir zamanın hangi vardiyaya düştüğünü işletmenin kendi saatlerine göre
 * bulur. Bitiş saati tutulmadığı için sınır, bir sonraki etkin vardiyanın
 * başlangıcıdır — gece yarısını sarmalayan vardiya da böyle çözülür.
 * Hiçbir vardiya etkin değilse null döner (etiketlenmez).
 */
export function vardiyaHesapla(date: Date, ayarlar: VardiyaAyarlari): Shift | null {
  const dakika = date.getHours() * 60 + date.getMinutes();
  const adaylar = ALANLAR.filter((a) => ayarlar[a.aktif]).map((a) => ({
    shift: a.shift,
    baslangic: saatToDakika(ayarlar[a.saat] as string),
  }));
  if (adaylar.length === 0) return null;

  adaylar.sort((a, b) => a.baslangic - b.baslangic);
  // Şu anki dakikadan önce başlayan en son vardiya; hiçbiri yoksa (gün
  // başlangıcından önce) bir önceki günden süregelen son vardiya geçerlidir.
  let secili = adaylar[adaylar.length - 1];
  for (const aday of adaylar) {
    if (aday.baslangic <= dakika) secili = aday;
    else break;
  }
  return secili.shift;
}

export function gecerliVardiyaMi(value: string): value is Shift {
  return value in SHIFTS;
}
