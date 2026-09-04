import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "../api/istemci";

/**
 * Bildirim izni ve cihaz jetonu.
 *
 * ÖNEMLİ SINIR: uzaktan bildirim, SDK 53'ten beri Android'de Expo Go'da
 * ÇALIŞMIYOR — development build gerekiyor (iOS'ta Expo Go'da çalışır).
 * Bu yüzden buradaki her adım sessizce başarısız olabilecek şekilde
 * yazıldı: izin alınamazsa, jeton üretilemezse ya da sunucuya
 * ulaşılamazsa uygulama normal çalışmaya devam ediyor. Bildirim bir ek,
 * ön koşul değil.
 *
 * Gerçek cihaz kontrolü de var: simülatör/emülatör push jetonu
 * üretemiyor ve orada hata fırlatıp konsolu kirletmesinin bir anlamı
 * yok.
 */

/**
 * Bildirim uygulama AÇIKKEN geldiğinde de görünsün.
 *
 * Varsayılan davranış, ön plandaki bildirimi sessizce yutmak. "Flaş
 * indirim" tam da uygulamayı kullanırken gelebilecek bir şey; yutulursa
 * işletme kredisini boşa harcamış olur.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android'de kanal olmadan bildirim sessiz düşüyor (sunucu da aynı adı gönderiyor). */
async function androidKanaliniKur() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("varsayilan", {
    name: "Bildirimler",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#7C6BFF",
  });
}

function projeKimligi(): string | undefined {
  // EAS projesi tanımlıysa jeton onunla üretilmeli; Expo Go'da bu değer
  // olmadan da çalışıyor.
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

export type BildirimDurumu = "bilinmiyor" | "acik" | "kapali" | "desteklenmiyor";

/**
 * İzni sorar, jetonu alır ve sunucuya kaydeder.
 *
 * Kullanıcının açık bir eylemiyle (Profil'deki anahtar) çağrılıyor —
 * uygulama ilk açılışta izin sormuyor. İzin isteme anını kullanıcının
 * "evet bunu istiyorum" dediği ana bağlamak, kabul oranını da doğru
 * yerden yükseltiyor; açılışta sorulan izin refleksle reddediliyor ve
 * bir daha sorulamıyor.
 */
export async function bildirimleriAc(): Promise<BildirimDurumu> {
  if (!Device.isDevice) return "desteklenmiyor";

  try {
    await androidKanaliniKur();

    const mevcut = await Notifications.getPermissionsAsync();
    let izin = mevcut.status;
    if (izin !== "granted") {
      const istenen = await Notifications.requestPermissionsAsync();
      izin = istenen.status;
    }
    if (izin !== "granted") return "kapali";

    const projectId = projeKimligi();
    const jeton = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    const sonuc = await api.post("/api/app/push", {
      jeton: jeton.data,
      platform: Platform.OS,
    });
    return sonuc.ok ? "acik" : "kapali";
  } catch {
    // Expo Go/Android, eksik yapılandırma, ağ hatası — hepsi aynı kapıya
    // çıkıyor: bildirim açılamadı, uygulama çalışmaya devam ediyor.
    return "desteklenmiyor";
  }
}

/** Sunucu tarafındaki aboneliği kapatır (cihaz izni değişmez). */
export async function bildirimleriKapat(): Promise<void> {
  try {
    const jeton = await Notifications.getExpoPushTokenAsync().catch(() => null);
    await api.delete("/api/app/push", jeton ? { jeton: jeton.data } : undefined);
  } catch {
    // Sessiz: kapatma isteği ulaşmadıysa kullanıcı yeniden deneyebilir.
  }
}

/** Cihazın izin durumunu okur — sunucuya sormadan, sadece görünürlük için. */
export async function bildirimDurumunuOku(): Promise<BildirimDurumu> {
  if (!Device.isDevice) return "desteklenmiyor";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted" ? "acik" : "kapali";
  } catch {
    return "bilinmiyor";
  }
}
