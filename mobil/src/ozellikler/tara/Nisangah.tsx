import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { renkler, yaricap } from "../../tasarim";

export const PENCERE = 248;

/**
 * Kamera üstündeki nişangah.
 *
 * Karartılmış ekranın ortasında net bir pencere: kullanıcıya "karekodu
 * buraya getir" demenin yazıdan daha hızlı yolu. Karartma dört ayrı
 * dikdörtgenle yapılıyor — tek bir yarı saydam katmana delik açmak
 * react-native'de maske gerektiriyor ve Android'de tutarsız çalışıyor.
 *
 * Köşe ayraçları ve yukarı aşağı süzülen tarama çizgisi, kameranın
 * çalıştığını söyleyen tek işaret: sabit bir çerçeve, donmuş bir
 * görüntüden ayırt edilemiyor.
 */
export function Nisangah() {
  const tarama = useSharedValue(0);
  const nabiz = useSharedValue(0);

  useEffect(() => {
    tarama.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    nabiz.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [tarama, nabiz]);

  const cizgiStili = useAnimatedStyle(() => ({
    transform: [{ translateY: tarama.value * (PENCERE - 3) }],
  }));

  const koseStili = useAnimatedStyle(() => ({
    opacity: 0.55 + nabiz.value * 0.45,
  }));

  return (
    <View style={stiller.kap} pointerEvents="none">
      <View style={[stiller.pencere, { width: PENCERE, height: PENCERE }]}>
        <Animated.View style={[stiller.kose, stiller.solUst, koseStili]} />
        <Animated.View style={[stiller.kose, stiller.sagUst, koseStili]} />
        <Animated.View style={[stiller.kose, stiller.solAlt, koseStili]} />
        <Animated.View style={[stiller.kose, stiller.sagAlt, koseStili]} />
        <Animated.View style={[stiller.taramaCizgisi, cizgiStili]} />
      </View>
    </View>
  );
}

const KOSE = 34;
const KALINLIK = 3.5;

const stiller = StyleSheet.create({
  kap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pencere: { borderRadius: yaricap.xl },
  kose: {
    position: "absolute",
    width: KOSE,
    height: KOSE,
    borderColor: renkler.vurguParlak,
  },
  solUst: {
    top: 0,
    left: 0,
    borderTopWidth: KALINLIK,
    borderLeftWidth: KALINLIK,
    borderTopLeftRadius: yaricap.l,
  },
  sagUst: {
    top: 0,
    right: 0,
    borderTopWidth: KALINLIK,
    borderRightWidth: KALINLIK,
    borderTopRightRadius: yaricap.l,
  },
  solAlt: {
    bottom: 0,
    left: 0,
    borderBottomWidth: KALINLIK,
    borderLeftWidth: KALINLIK,
    borderBottomLeftRadius: yaricap.l,
  },
  sagAlt: {
    bottom: 0,
    right: 0,
    borderBottomWidth: KALINLIK,
    borderRightWidth: KALINLIK,
    borderBottomRightRadius: yaricap.l,
  },
  taramaCizgisi: {
    position: "absolute",
    left: KOSE / 2,
    right: KOSE / 2,
    height: 2.5,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.vurguParlak,
    shadowColor: renkler.vurguParlak,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
