/**
 * Ücretsiz deneme kaydının kuralları.
 *
 * Satışın en ucuz kanalı kendi kendine açılan hesap; ama açık bir kayıt
 * formu aynı zamanda çöp hesap üretme makinesidir. Kurallar burada,
 * arayüzden bağımsız ve test edilebilir duruyor.
 */

import { sifreSorunu } from "../kimlik/sifre";
import { alanDogrula } from "../cekirdek/desenler";

export const DENEME_GUN = 7;

/** Aynı IP'den 24 saatte açılabilecek deneme hesabı sayısı. */
export const IP_BASINA_GUNLUK_SINIR = 3;

/** Denemenin biteceği an: girilen gün dahil, gün sonu. */
export function denemeBitisi(simdi = new Date()): Date {
  const t = new Date(simdi);
  t.setDate(t.getDate() + DENEME_GUN);
  t.setHours(23, 59, 59, 999);
  return t;
}

export type KayitGirdisi = {
  firma: string;
  adSoyad: string;
  eposta: string;
  telefon: string;
  kullaniciAdi: string;
  sifre: string;
  kvkkOnay: boolean;
};

/**
 * Form doğrulaması. Hata varsa Türkçe mesaj, yoksa null.
 *
 * Telefon ve kullanıcı adı normalleştirmesi çağıran tarafta yapılır;
 * burada yalnızca "eksik/biçimsiz" kontrolü var.
 */
export function kayitSorunu(girdi: KayitGirdisi): string | null {
  // Bu form KİMLİK DOĞRULAMASI İSTEMİYOR — internetteki herkes gönderebilir.
  // Üç alanda da yalnızca ALT sınır vardı; üst sınır yoktu ve değerler
  // doğrudan hesap/işletme/kullanıcı kaydına gidiyordu. Sınırlar artık
  // desenler.ts'ten, yani panelin geri kalanıyla aynı yerden geliyor —
  // e-posta deseni de öyle: önceden bu dosyada, kullanicilar/actions.ts'te,
  // isletmeler/actions.ts'te ve hesaplar/actions.ts'te dört ayrı kopya vardı.
  for (const [ham, tur, ad] of [
    [girdi.firma, "isletmeAdi", "İşletme adı"],
    [girdi.adSoyad, "kisiAdi", "Ad soyad"],
    [girdi.eposta, "eposta", "E-posta"],
    [girdi.telefon, "telefon", "Telefon"],
  ] as const) {
    const sonuc = alanDogrula(ham, tur, ad);
    if (!sonuc.ok) return sonuc.hata;
  }

  const sifreHatasi = sifreSorunu(girdi.sifre);
  if (sifreHatasi) return sifreHatasi;
  // Rıza olmadan iletişim bilgisi saklayamayız; kaydın kendisi de o bilgiye
  // dayandığı için bu kutu isteğe bağlı değil.
  if (!girdi.kvkkOnay) return "Devam etmek için aydınlatma metnini onaylayın.";
  return null;
}
