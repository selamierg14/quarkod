import { useEffect } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { renkler, yaricap } from "../tasarim";

const RENKLER = [
  renkler.vurgu,
  renkler.vurguParlak,
  renkler.odul,
  renkler.odulParlak,
  renkler.basari,
  "#EC4899",
];

/** Parça sayısı — daha fazlası düşük donanımda kare düşürüyor. */
const ADET = 26;

/**
 * Kutlama konfetisi.
 *
 * Hazır bir kütüphane yerine yirmi altı `Animated.View`: eklenecek paket
 * (lottie ya da confetti-cannon) bu tek kullanım için hem boyut hem de
 * bir bakım yükü demekti. Parçalar UI thread'inde düşüyor, JS tarafı
 * ödül ekranını çizerken bile takılmıyorlar.
 *
 * Rastgelelik BİR KEZ, render dışında üretiliyor: her yeniden çizimde
 * yeniden rastgele değer üretmek, parçaları animasyonun ortasında
 * ışınlıyordu.
 */
export function Konfeti({ etkin }: { etkin: boolean }) {
  const { width, height } = useWindowDimensions();

  if (!etkin) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: ADET }, (_, i) => (
        <Parca key={i} sira={i} genislik={width} yukseklik={height} />
      ))}
    </View>
  );
}

function Parca({
  sira,
  genislik,
  yukseklik,
}: {
  sira: number;
  genislik: number;
  /** Düşüş mesafesi ekran boyundan geliyor: sabit bir değer, uzun
      ekranlarda parçaları ekranın ortasında bırakıyordu. */
  yukseklik: number;
}) {
  // Deterministik "rastgelelik": sıra numarasından türetiliyor, böylece
  // her parça farklı ama her çizimde aynı yerde başlıyor.
  const tohum = (sira * 9301 + 49297) % 233280;
  const rasgele = tohum / 233280;
  const baslangicX = rasgele * genislik;
  const sapma = (rasgele - 0.5) * 140;
  const gecikme = sira * 45;
  const sure = 2200 + rasgele * 1200;
  const renk = RENKLER[sira % RENKLER.length];
  const boyut = 7 + Math.round(rasgele * 6);
  const kare = sira % 3 === 0;

  const ilerleme = useSharedValue(0);

  useEffect(() => {
    ilerleme.value = withDelay(
      gecikme,
      withTiming(1, { duration: sure, easing: Easing.out(Easing.quad) }),
    );
  }, [gecikme, sure, ilerleme]);

  const animasyon = useAnimatedStyle(() => ({
    transform: [
      { translateY: ilerleme.value * (yukseklik + 80) - 60 },
      { translateX: ilerleme.value * sapma },
      { rotate: `${ilerleme.value * (kare ? 720 : -540)}deg` },
    ],
    // Son çeyrekte sönüyor: ekranın altında birikmiş parçalar kalmıyor.
    opacity: ilerleme.value > 0.75 ? (1 - ilerleme.value) * 4 : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: baslangicX,
          top: 0,
          width: boyut,
          height: boyut * (kare ? 1 : 1.8),
          backgroundColor: renk,
          borderRadius: kare ? 2 : yaricap.tam,
        },
        animasyon,
      ]}
    />
  );
}
