import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { gorselAdresi } from "../api/gorsel";
import { renkler } from "../tasarim";

/** Kaynak değişince çapraz geçiş süresi. */
const GECIS_MS = 260;

/**
 * Mekan görseli.
 *
 * `expo-image`, React Native'in kendi `Image`'ının yerine geçiyor. Fark
 * fotoğraf ağırlıklı bir uygulamada gözle görülür:
 *
 *   • Disk + bellek önbelleği — aynı kapak, listeden detaya geçerken
 *     yeniden indirilmiyor. RN Image'da her ekran kendi isteğini atıyordu.
 *   • Çapraz geçiş — görsel "pat" diye belirmiyor, gri kutudan yumuşakça
 *     açılıyor. Yavaş bağlantıda uygulamanın en ucuz duran anı buydu.
 *   • `recyclingKey` — geri dönüştürülen liste satırında bir önceki
 *     mekanın fotoğrafı bir kare boyunca görünmüyor.
 *
 * Görsel yoksa (ya da yüklenene kadar) mekanın MARKA RENGİNDEN türetilen
 * bir gradyan duruyor: nötr gri bir kutu her mekanı aynı gösteriyordu,
 * marka rengi ise boşken bile mekana ait bir şey söylüyor.
 */
export function Gorsel({
  kaynak,
  markaRengi = renkler.vurgu,
  contentFit = "cover",
  oncelik = "normal",
  stil,
  gecisSuresi = GECIS_MS,
}: {
  /** Sunucudan gelen yol; mutlak/göreli ayrımını gorselAdresi çözüyor. */
  kaynak: string | null | undefined;
  markaRengi?: string;
  contentFit?: ImageContentFit;
  /** Ekranın ilk bakışta gördüğü büyük görsellerde "high". */
  oncelik?: "low" | "normal" | "high";
  stil?: StyleProp<ViewStyle>;
  gecisSuresi?: number;
}) {
  const adres = gorselAdresi(kaynak);

  return (
    <View style={[stiller.kap, { backgroundColor: markaRengi }, stil]}>
      {/* Gradyan ve fotoğraf ÜST ÜSTE BİNMİYOR — biri ya da diğeri.
          Üst üste bindiklerinde web'de (react-native-web) mutlak konumlu
          gradyan fotoğrafın üstüne boyanıyor ve mekanın kapağı yerine
          marka renginde bir dikdörtgen görünüyordu; `zIndex` vermek de
          çözmedi. Yükleme anındaki zemini kabın kendi arka planı
          veriyor, fotoğraf onun üstüne yumuşakça açılıyor. */}
      {adres ? (
        <Image
          source={adres}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          // Web'deki çapraz geçiş, görseli "transitioning" sınıfında
          // bırakıp yarı saydam sabitliyor; orada geçiş kapalı.
          transition={Platform.OS === "web" ? 0 : gecisSuresi}
          cachePolicy="memory-disk"
          priority={oncelik}
          recyclingKey={adres}
          accessible={false}
        />
      ) : (
        <LinearGradient
          colors={[markaRengi, renkler.zemin]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { overflow: "hidden" },
});
