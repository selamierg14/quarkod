import { Alert, Platform } from "react-native";

/**
 * Geri alınamaz eylemler için onay sorusu — iki platformda da çalışan.
 *
 * `Alert.alert` düğmeleri react-native-web'de YOK: çağrı sessizce hiçbir
 * şey yapmıyor, "onayla" dalı hiç çalışmıyor. Yani web önizlemesinde hesap
 * silme ve buluşma iptali, kullanıcı hiçbir hata görmeden işlemsiz
 * kalıyordu. Web'de tarayıcının kendi `confirm`ü kullanılıyor.
 */
export function onayIste(baslik: string, mesaj: string, onayMetni: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${baslik}\n\n${mesaj}`) ?? false);
  }
  return new Promise((coz) => {
    Alert.alert(
      baslik,
      mesaj,
      [
        { text: "Vazgeç", style: "cancel", onPress: () => coz(false) },
        { text: onayMetni, style: "destructive", onPress: () => coz(true) },
      ],
      // Android'de dışarı dokunup kapatmak da "vazgeç" sayılmalı; yoksa
      // söz hiç çözülmez ve bekleyen işlem askıda kalır.
      { cancelable: true, onDismiss: () => coz(false) },
    );
  });
}
