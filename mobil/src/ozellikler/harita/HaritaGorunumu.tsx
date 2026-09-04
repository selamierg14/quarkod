import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { renkler } from "../../tasarim";

/**
 * Leaflet sayfasını platforma göre çizen ince katman.
 *
 * Native'de `react-native-webview`, web önizlemesinde `<iframe>`:
 * react-native-webview'ın web desteği yok, orada çizilirse bileşen hiç
 * görünmüyordu. İkisi de AYNI HTML'i alıyor ve aynı `postMessage`
 * sözleşmesini konuşuyor, dolayısıyla üstteki ekran platformu hiç
 * bilmiyor.
 */
export type HaritaMesaji =
  | { tur: "hazir" }
  | { tur: "mekanSecildi"; id: string }
  | { tur: "secimTemizlendi" };

export function HaritaGorunumu({
  html,
  onMesaj,
}: {
  html: string;
  onMesaj: (mesaj: HaritaMesaji) => void;
}) {
  if (Platform.OS === "web") return <WebHarita html={html} onMesaj={onMesaj} />;

  return (
    <WebView
      style={stiller.tuval}
      containerStyle={stiller.tuval}
      originWhitelist={["*"]}
      source={{ html }}
      // Harita jestleri (kaydır/yakınlaştır) WebView'in kendi kaydırma
      // davranışıyla çakışmasın.
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      javaScriptEnabled
      domStorageEnabled
      // Yükleme boyunca beyaz bir kare yerine uygulamanın zemini dursun.
      backgroundColor={renkler.zemin}
      onMessage={(olay) => {
        try {
          onMesaj(JSON.parse(olay.nativeEvent.data) as HaritaMesaji);
        } catch {
          // Beklenmeyen mesaj — yok say.
        }
      }}
    />
  );
}

/** Web önizlemesi: aynı HTML bir iframe içinde, mesajlar `window.postMessage` ile. */
function WebHarita({
  html,
  onMesaj,
}: {
  html: string;
  onMesaj: (mesaj: HaritaMesaji) => void;
}) {
  // Dinleyici bir kez bağlanıyor; en güncel geri çağrıya ulaşmak için
  // ref üzerinden okuyor. Ref'e YAZMA işi efekte alındı: render
  // sırasında ref güncellemek React'in eşzamanlı çiziminde yarım kalmış
  // bir render'ın değeri sızdırmasına yol açabiliyor.
  const onMesajRef = useRef(onMesaj);
  useEffect(() => {
    onMesajRef.current = onMesaj;
  }, [onMesaj]);

  useEffect(() => {
    function dinle(olay: MessageEvent) {
      if (typeof olay.data !== "string") return;
      try {
        onMesajRef.current(JSON.parse(olay.data) as HaritaMesaji);
      } catch {
        // Sayfadaki başka bir kaynaktan gelen mesaj olabilir — yok say.
      }
    }
    window.addEventListener("message", dinle);
    return () => window.removeEventListener("message", dinle);
  }, []);

  return (
    <View style={stiller.tuval}>
      {/* Web'e özgü DOM etiketi; bu dal yalnızca Platform.OS === "web"
          iken çalışıyor. */}
      <iframe
        srcDoc={html}
        style={{ border: "none", width: "100%", height: "100%", background: renkler.zemin }}
        title="Harita"
      />
    </View>
  );
}

const stiller = StyleSheet.create({
  tuval: { flex: 1, backgroundColor: renkler.zemin },
});
