/**
 * Ücretsiz deneme kaydının kuralları.
 *
 * Satışın en ucuz kanalı kendi kendine açılan hesap; ama açık bir kayıt
 * formu aynı zamanda çöp hesap üretme makinesidir. Kurallar burada,
 * arayüzden bağımsız ve test edilebilir duruyor.
 */

import { sifreSorunu } from "./sifre";

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
  if (girdi.firma.trim().length < 2) return "İşletme adı gerekli.";
  if (girdi.adSoyad.trim().length < 3) return "Ad soyad gerekli.";
  if (!/^\S+@\S+\.\S+$/.test(girdi.eposta)) return "Geçerli bir e-posta girin.";
  const sifreHatasi = sifreSorunu(girdi.sifre);
  if (sifreHatasi) return sifreHatasi;
  // Rıza olmadan iletişim bilgisi saklayamayız; kaydın kendisi de o bilgiye
  // dayandığı için bu kutu isteğe bağlı değil.
  if (!girdi.kvkkOnay) return "Devam etmek için aydınlatma metnini onaylayın.";
  return null;
}
