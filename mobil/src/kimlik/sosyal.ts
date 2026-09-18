import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { api } from "../api/istemci";

/**
 * APPLE / GOOGLE İLE GİRİŞ — istemci tarafı.
 *
 * Buradan sunucuya giden tek şey sağlayıcının imzaladığı KİMLİK JETONU.
 * "Ben şu kullanıcıyım" diyen bir gövde gönderilmiyor; kimliğe sunucu
 * karar veriyor (bkz. lib/kimlik/sosyal-giris.ts). Uygulamanın rolü
 * jetonu almaktan ibaret.
 *
 * HANGİ DÜĞMENİN ÇİKACAĞINI SUNUCU SÖYLÜYOR (`/sosyal-giris` GET):
 * sağlayıcı kimlikleri (istemci id'leri) sunucuda yapılandırılmamışsa o
 * yöntem çalışmaz. Düğmeyi yine de göstermek, dokunan herkese hata
 * vermek olurdu — yapılandırma bitene kadar düğme hiç görünmüyor.
 */

export type Saglayici = "apple" | "google";

/** Sunucuda açık olan yöntemler; hata durumunda boş (düğme çizilmiyor). */
export async function acikYontemler(): Promise<Saglayici[]> {
  const sonuc = await api.acikGet<{ saglayicilar: Saglayici[] }>("/api/app/sosyal-giris");
  if (!sonuc.ok) return [];

  const sunucu = sonuc.veri.saglayicilar ?? [];
  const kullanilabilir: Saglayici[] = [];

  if (sunucu.includes("apple") && (await appleKullanilabilirMi())) {
    kullanilabilir.push("apple");
  }
  // Google native kurulumu (istemci kütüphanesi + SHA parmak izleri)
  // tamamlanmadan düğme gösterilmiyor: bkz. googleKimlikJetonu.
  if (sunucu.includes("google") && googleHazirMi()) kullanilabilir.push("google");

  return kullanilabilir;
}

/**
 * Apple ile girişte cihaz desteği ŞART.
 *
 * `isAvailableAsync` yalnızca iOS 13+ cihazlarda true dönüyor; Android ve
 * web'de düğmeyi göstermek, dokunanı hataya götürmek olurdu.
 */
export async function appleKullanilabilirMi(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export type JetonSonucu =
  | { ok: true; jeton: string; ad: string | null }
  | { ok: false; iptal: boolean; hata: string };

/**
 * Apple akışını çalıştırır ve kimlik jetonunu döndürür.
 *
 * AD YALNIZCA İLK GİRİŞTE geliyor (Apple bunu bir daha vermiyor), o
 * yüzden hemen sunucuya iletiliyor. Sonraki girişlerde `ad` null ve
 * sunucu zaten kayıtlı adı kullanıyor.
 */
export async function appleKimlikJetonu(): Promise<JetonSonucu> {
  try {
    const kimlik = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!kimlik.identityToken) {
      return { ok: false, iptal: false, hata: "Apple kimliği alınamadı." };
    }

    const ad = [kimlik.fullName?.givenName, kimlik.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return { ok: true, jeton: kimlik.identityToken, ad: ad || null };
  } catch (error) {
    // Kullanıcı vazgeçtiğinde hata gösterilmiyor: iptal bir hata değil.
    const kod = (error as { code?: string }).code;
    if (kod === "ERR_REQUEST_CANCELED") {
      return { ok: false, iptal: true, hata: "" };
    }
    return { ok: false, iptal: false, hata: "Apple ile giriş tamamlanamadı." };
  }
}

/**
 * GOOGLE — henüz istemci tarafı bağlanmadı.
 *
 * Sunucu tarafı hazır ve Apple ile aynı ucu kullanıyor; eksik olan tek
 * şey native kütüphane (`@react-native-google-signin/google-signin`) ve
 * OAuth istemci kimlikleri + Android SHA parmak izleri. İkisi de
 * Google Cloud hesabı gerektiriyor ve geliştirme derlemesi olmadan
 * denenemiyor.
 *
 * Yarım çalışan bir düğme koymak yerine `googleHazirMi()` false dönüyor:
 * düğme hiç çıkmıyor. Kütüphane eklendiğinde burada jetonu döndürmek ve
 * bu bayrağı açmak yetiyor — akışın geri kalanı (sunucu doğrulaması,
 * hesap açma, bağlama) zaten çalışıyor.
 */
export function googleHazirMi(): boolean {
  return false;
}

export async function googleKimlikJetonu(): Promise<JetonSonucu> {
  return { ok: false, iptal: false, hata: "Google ile giriş henüz kullanılamıyor." };
}

export async function kimlikJetonuAl(saglayici: Saglayici): Promise<JetonSonucu> {
  return saglayici === "apple" ? appleKimlikJetonu() : googleKimlikJetonu();
}
