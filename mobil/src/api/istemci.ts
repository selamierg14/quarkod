import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Backend adresi.
 *
 * Geliştirmede telefon "localhost"u KENDİSİ sanır; bilgisayarın LAN
 * adresine ihtiyaç var. Expo, geliştirme sunucusunun adresini zaten
 * biliyor (`hostUri`) — oradaki IP'yi alıp Next.js'in portuna
 * (3000) yönlendiriyoruz, böylece elle IP yazmaya gerek kalmıyor.
 * Yayında bu değer `EXPO_PUBLIC_API_URL` ile geliyor.
 */
function tabanAdres(): string {
  const acikAdres = process.env.EXPO_PUBLIC_API_URL;
  if (acikAdres) return acikAdres.replace(/\/$/, "");

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const ip = hostUri?.split(":")[0];
  if (ip && ip !== "localhost" && ip !== "127.0.0.1") return `http://${ip}:3000`;

  return "http://localhost:3000";
}

export const API_TABAN = tabanAdres();

const JETON_ANAHTARI = "biyerlere_jeton";

/**
 * Jeton deposu.
 *
 * Native'de SecureStore (Keychain/Keystore) — jeton 30 gün geçerli bir
 * kimlik, `AsyncStorage`'ta düz metin durması yanlış olurdu. Web'de
 * SecureStore yok, oraya `localStorage`'a düşüyoruz (mevcut Biyerlere
 * web sürümüyle AYNI anahtar: aynı tarayıcıda ikisi de aynı oturumu
 * görsün).
 */
export const jetonDeposu = {
  async oku(): Promise<string | null> {
    try {
      if (Platform.OS === "web") return globalThis.localStorage?.getItem(JETON_ANAHTARI) ?? null;
      return await SecureStore.getItemAsync(JETON_ANAHTARI);
    } catch {
      return null;
    }
  },
  async yaz(jeton: string): Promise<void> {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.setItem(JETON_ANAHTARI, jeton);
      else await SecureStore.setItemAsync(JETON_ANAHTARI, jeton);
    } catch {
      // Depolama kapalıysa oturum yalnızca bu açılış için geçerli olur.
    }
  },
  async sil(): Promise<void> {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.removeItem(JETON_ANAHTARI);
      else await SecureStore.deleteItemAsync(JETON_ANAHTARI);
    } catch {
      // Yok sayılabilir.
    }
  },
};

/**
 * Gizli OLMAYAN küçük tercihler (ör. "bildirimlere en son ne zaman
 * baktı").
 *
 * Jetonla aynı depoyu kullanıyor ama ayrı bir kapı: jeton bir kimlik ve
 * SecureStore'da (Keychain/Keystore) durması şart; bunlar yalnızca
 * kolaylık verisi. Ayrı tutmak, ileride bu tarafı AsyncStorage'a
 * taşımayı tek dosyalık bir değişiklik yapıyor — jetonun yanlışlıkla
 * oraya kaymasına da engel.
 *
 * Okuma/yazma HER ZAMAN sessizce başarısız olabiliyor: gizli sekmede
 * localStorage kapalı, bazı Android cihazlarda Keystore erişilemez
 * olabiliyor. Tercih kaybolursa varsayılana düşülüyor, uygulama
 * çalışmaya devam ediyor.
 */
export const yerelTercih = {
  async oku(anahtar: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") return globalThis.localStorage?.getItem(anahtar) ?? null;
      return await SecureStore.getItemAsync(anahtar);
    } catch {
      return null;
    }
  },
  async yaz(anahtar: string, deger: string): Promise<void> {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.setItem(anahtar, deger);
      else await SecureStore.setItemAsync(anahtar, deger);
    } catch {
      // Tercih kaydedilemedi; bir dahaki açılışta varsayılan geçerli.
    }
  },
};

export type ApiSonuc<T> =
  | { ok: true; veri: T }
  | { ok: false; hata: string; durum: number };

async function istek<T>(
  yol: string,
  secenekler: {
    yontem?: "GET" | "POST" | "PUT" | "DELETE";
    govde?: unknown;
    jetonlu?: boolean;
  } = {},
): Promise<ApiSonuc<T>> {
  const { yontem = "GET", govde, jetonlu = true } = secenekler;
  const jeton = jetonlu ? await jetonDeposu.oku() : null;

  try {
    const yanit = await fetch(`${API_TABAN}${yol}`, {
      method: yontem,
      headers: {
        Accept: "application/json",
        ...(govde ? { "Content-Type": "application/json" } : {}),
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: govde ? JSON.stringify(govde) : undefined,
    });

    let coz: unknown;
    try {
      coz = await yanit.json();
    } catch {
      return { ok: false, hata: "Sunucudan geçersiz yanıt geldi.", durum: yanit.status };
    }

    if (!yanit.ok) {
      const mesaj =
        coz && typeof coz === "object" && "hata" in coz && typeof coz.hata === "string"
          ? coz.hata
          : "Bir şeyler ters gitti.";
      return { ok: false, hata: mesaj, durum: yanit.status };
    }
    return { ok: true, veri: coz as T };
  } catch {
    return { ok: false, hata: "Bağlantı kurulamadı. İnternetini kontrol et.", durum: 0 };
  }
}

export const api = {
  get: <T,>(yol: string) => istek<T>(yol),
  post: <T,>(yol: string, govde?: unknown) => istek<T>(yol, { yontem: "POST", govde }),
  put: <T,>(yol: string, govde?: unknown) => istek<T>(yol, { yontem: "PUT", govde }),
  delete: <T,>(yol: string, govde?: unknown) => istek<T>(yol, { yontem: "DELETE", govde }),
  /** Girişsiz uçlar (keşfet listesi, mekan detayı). */
  acikGet: <T,>(yol: string) => istek<T>(yol, { jetonlu: false }),
  acikPost: <T,>(yol: string, govde?: unknown) =>
    istek<T>(yol, { yontem: "POST", govde, jetonlu: false }),
};
