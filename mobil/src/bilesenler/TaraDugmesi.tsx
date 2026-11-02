import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Basilabilir } from "./Basilabilir";
import { renkler, bosluk, yaricap, isima, SEKME_YUKSEKLIGI } from "../tasarim";

/**
 * Sekme çubuğunun ÜSTÜNDE yüzen karekod okutma düğmesi.
 *
 * Uygulamanın TEK puan kazandıran eylemi bu; beşinci bir sekme olarak
 * diğerlerinin arasına karışmak yerine çubuğun üstünde yüzüyor ve
 * gradyanla ayrışıyor. "Ana eylem" hiyerarşisini kullanıcıya
 * anlatmanın en doğrudan yolu.
 *
 * Çubuğun İÇİNE (ortaya) değil ÜSTÜNE konuldu: dört sekmenin ortasına
 * oturan bir düğme, komşu iki sekmenin etiketlerini kapatıyordu — çentikli
 * bir çubuk çizmeden bu çakışma temiz çözülmüyor.
 *
 * Etrafındaki halka yavaşça nefes alıyor: durağan bir düğme dekor gibi
 * duruyordu, hafif hareket onu eylem olarak okutuyor.
 */
export function TaraDugmesi({ altBosluk }: { altBosluk: number }) {
  const router = useRouter();
  const nefes = useSharedValue(0);

  useEffect(() => {
    nefes.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [nefes]);

  const halka = useAnimatedStyle(() => ({
    opacity: 0.25 + nefes.value * 0.35,
    transform: [{ scale: 1 + nefes.value * 0.12 }],
  }));

  return (
    <View
      style={[stiller.kap, { bottom: SEKME_YUKSEKLIGI + altBosluk + bosluk.m }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[stiller.halka, halka]} pointerEvents="none" />
      <Basilabilir
        onPress={() => router.push("/tara")}
        olcek={0.9}
        titresim="orta"
        style={[stiller.dugme, isima(renkler.vurgu, "guclu")]}
        accessibilityRole="button"
        accessibilityLabel="Karekod okut"
      >
        <LinearGradient
          colors={[renkler.vurguParlak, renkler.vurgu]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* İkon açık bir katmanda: mutlak konumlu gradyan, akış içindeki
            SVG'nin üstüne boyanıyor ve düğme boş bir daire görünüyordu
            (aynı tuzak için bkz. CamYuzey). */}
        <View style={stiller.ikonKap}>
          <QrIkonu />
        </View>
      </Basilabilir>
    </View>
  );
}

function QrIkonu() {
  const ortak = {
    stroke: "#FFFFFF",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Rect x="3" y="3" width="7" height="7" rx="1.6" {...ortak} />
      <Rect x="14" y="3" width="7" height="7" rx="1.6" {...ortak} />
      <Rect x="3" y="14" width="7" height="7" rx="1.6" {...ortak} />
      <Path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" {...ortak} />
    </Svg>
  );
}

const DUGME = 58;

/**
 * Kaydırılabilir ekranların alt payına eklenmesi gereken boşluk.
 *
 * Düğme sekme çubuğunun üstünde YÜZÜYOR; listeler bunu hesaba katmazsa
 * son satır kalıcı olarak düğmenin altında kalıyor.
 */
export const TARA_DUGMESI_PAYI = DUGME + 28;

const stiller = StyleSheet.create({
  kap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    // Sekme çubuğunun buzlu camının üstünde kalsın.
    zIndex: 10,
  },
  halka: {
    position: "absolute",
    top: -6,
    width: DUGME + 18,
    height: DUGME + 18,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.vurgu,
  },
  ikonKap: { zIndex: 1 },
  dugme: {
    width: DUGME,
    height: DUGME,
    minHeight: DUGME,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: renkler.zemin,
  },
});
