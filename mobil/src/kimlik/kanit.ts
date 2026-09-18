import { acikYontemler, kimlikJetonuAl } from "./sosyal";
import type { AppKullanici } from "../api/tipler";

/**
 * HASSAS İŞLEMLERİN KİMLİK KANITI.
 *
 * Şifre değiştirme, kurtarma numarası ekleme/silme ve hesap silme,
 * oturumun yanında bir kanıt daha istiyor (bkz. lib/kimlik/app-api.ts,
 * kimlikKanitiDogrula). Şifreyle açılmış hesapta kanıt mevcut şifre;
 * Apple/Google ile açılmış hesapta kullanıcı bir şifre BİLMİYOR, o yüzden
 * kanıt sağlayıcıdan alınan taze bir kimlik jetonu.
 *
 * Bu dosya olmadan sosyal hesap sahibi üç işlemi de yapamıyordu:
 * dolduramayacağı bir "mevcut şifre" alanına takılıyordu. Hesabını
 * silememek ayrıca mağaza kuralına aykırı (Apple 5.1.1.v).
 */

export function sifreIleMi(kullanici: AppKullanici | null): boolean {
  // Alan eski sürümlerden gelmiyorsa şifreli varsayılıyor: bilinmeyen
  // durumda şifre sormak, yanlışlıkla sağlayıcı akışına düşmekten iyi.
  return kullanici?.sifreBelirlendi !== false;
}

export type KanitSonucu =
  | { ok: true; govde: Record<string, unknown> }
  | { ok: false; iptal: boolean; hata: string };

/**
 * İsteğe eklenecek kanıt alanlarını hazırlar.
 *
 * Şifreli hesapta tek satır; sosyal hesapta sağlayıcı akışını çalıştırıp
 * jetonu döndürüyor. HANGİ sağlayıcı olduğunu sunucu zaten `sub`
 * eşleşmesiyle denetliyor, o yüzden cihazda açık olan ilk yöntem
 * deneniyor.
 */
export async function kanitHazirla(
  kullanici: AppKullanici | null,
  sifre: string,
): Promise<KanitSonucu> {
  if (sifreIleMi(kullanici)) {
    return { ok: true, govde: { mevcutSifre: sifre } };
  }

  const yontemler = await acikYontemler();
  if (yontemler.length === 0) {
    return {
      ok: false,
      iptal: false,
      hata: "Kimlik doğrulama yöntemi bu cihazda kullanılamıyor.",
    };
  }

  const saglayici = yontemler[0];
  const jeton = await kimlikJetonuAl(saglayici);
  if (!jeton.ok) return { ok: false, iptal: jeton.iptal, hata: jeton.hata };

  return { ok: true, govde: { saglayici, jeton: jeton.jeton } };
}
