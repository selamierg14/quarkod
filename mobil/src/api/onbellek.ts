import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Sunucu yanıtlarının ÇEVRİMDIŞI kopyası.
 *
 * Sorun şuydu: internet yokken Keşfet ekranı sessizce boş kalıyordu —
 * ne liste, ne hata, ne "tekrar dene". Metroda ya da çekmeyen bir yerde
 * uygulamayı açan kullanıcı bozuk bir uygulama görüyordu. Oysa en son
 * gördüğü listeyi göstermek, hiçbir şey göstermemekten her zaman iyi.
 *
 * NEDEN AsyncStorage (SecureStore değil): SecureStore anahtar başına
 * ~2 KB'lık bir sınıra takılıyor ve 52 mekanlık liste oraya sığmıyor.
 * Zaten burada gizli bir şey de yok — herkese açık mekan listesi.
 * Jeton yine SecureStore'da (bkz. istemci.ts).
 *
 * VERİ ESKİYEBİLİR ve bu kabul ediliyor: önbellekten okunan liste ekrana
 * çiziliyor, arkadan tazesi isteniyor. Taze veri gelince sessizce
 * değişiyor. Kullanıcıya "bu eski olabilir" demek yalnızca ağ isteği de
 * DÜŞTÜĞÜNDE anlamlı — o zaman ekranda çevrimdışı şeridi çıkıyor.
 */

const ONEK = "onbellek:";

/** Kayıtların en fazla ne kadar eski olabileceği (ms) — bir hafta. */
const EN_FAZLA_YAS_MS = 7 * 24 * 60 * 60 * 1000;

type Kayit<T> = { yazildi: number; veri: T };

export async function onbellekOku<T>(yol: string): Promise<T | null> {
  try {
    const ham = await AsyncStorage.getItem(ONEK + yol);
    if (!ham) return null;

    const kayit = JSON.parse(ham) as Kayit<T>;
    /**
     * Bir haftadan eski kayıt GÖSTERİLMİYOR. Çevrimdışı bir kullanıcıya
     * geçen ayın "şu an açık" listesini sunmak, yardım değil yanlış
     * bilgi olurdu.
     */
    if (Date.now() - kayit.yazildi > EN_FAZLA_YAS_MS) {
      void AsyncStorage.removeItem(ONEK + yol);
      return null;
    }
    return kayit.veri;
  } catch {
    // Bozuk JSON ya da depo erişilemiyor — önbellek yokmuş gibi devam.
    return null;
  }
}

export async function onbellekYaz<T>(yol: string, veri: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ONEK + yol,
      JSON.stringify({ yazildi: Date.now(), veri } satisfies Kayit<T>),
    );
  } catch {
    // Disk dolu olabilir; önbellek bir kolaylık, yazılamaması akışı bozmaz.
  }
}

/** Çıkışta çağrılıyor — kişiye bağlı yanıtlar cihazda kalmasın. */
export async function onbellegiTemizle(): Promise<void> {
  try {
    const anahtarlar = await AsyncStorage.getAllKeys();
    const bizimkiler = anahtarlar.filter((a) => a.startsWith(ONEK));
    if (bizimkiler.length > 0) await AsyncStorage.multiRemove(bizimkiler);
  } catch {
    // Temizlenemezse bir sonraki yazma zaten üzerine yazıyor.
  }
}
