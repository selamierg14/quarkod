import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Gorsel } from "../../bilesenler/Gorsel";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { CamYuzey } from "../../bilesenler/CamYuzey";
import { renkler, bosluk, yaricap, fontlar } from "../../tasarim";

export const KAPAK_YUKSEKLIGI = 320;

/**
 * Detay ekranının paralaks kapağı.
 *
 * Üç şey aynı kaydırma değerine bağlı:
 *
 *   1. Fotoğraf, sayfadan YAVAŞ kayıyor (0.5 kat) — derinlik hissini
 *      veren şey bu. Aşağı çekildiğinde ise büyüyor (rubber band),
 *      böylece listenin üstünde beyaz bir boşluk açılmıyor.
 *   2. Fotoğrafın üstündeki karartma kaydırdıkça koyulaşıyor; başlık
 *      yukarı çıkarken metin okunur kalıyor.
 *   3. Üstteki buzlu cam çubuk, fotoğraf ekrandan çıkmak üzereyken
 *      beliriyor ve mekan adını devralıyor.
 *
 * Hepsi UI thread'inde (Reanimated worklet) çalışıyor: JS tarafı menüyü
 * çizmekle meşgulken bile kaydırma takılmıyor.
 */
export function ParalaksBaslik({
  kaydirma,
  kapakUrl,
  markaRengi,
  ad,
  ustBosluk,
  onGeri,
  onPaylas,
}: {
  kaydirma: SharedValue<number>;
  kapakUrl: string | null;
  markaRengi: string;
  ad: string;
  ustBosluk: number;
  onGeri: () => void;
  onPaylas?: () => void;
}) {
  const cubukYuksekligi = ustBosluk + 52;
  const gecisNoktasi = KAPAK_YUKSEKLIGI - cubukYuksekligi;

  const kapakStili = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          kaydirma.value,
          [-KAPAK_YUKSEKLIGI, 0, KAPAK_YUKSEKLIGI],
          [-KAPAK_YUKSEKLIGI / 2, 0, KAPAK_YUKSEKLIGI * 0.5],
          Extrapolation.CLAMP,
        ),
      },
      {
        // Aşağı çekince büyüyor; yukarı kaydırınca 1'de kalıyor.
        scale: interpolate(kaydirma.value, [-KAPAK_YUKSEKLIGI, 0], [2.1, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const karartmaStili = useAnimatedStyle(() => ({
    opacity: interpolate(kaydirma.value, [0, gecisNoktasi], [0, 1], Extrapolation.CLAMP),
  }));

  const cubukStili = useAnimatedStyle(() => ({
    opacity: interpolate(
      kaydirma.value,
      [gecisNoktasi - 60, gecisNoktasi],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <>
      <Animated.View style={[stiller.kapakKabi, kapakStili]} pointerEvents="none">
        <Gorsel
          kaynak={kapakUrl}
          markaRengi={markaRengi}
          oncelik="high"
          stil={StyleSheet.absoluteFill}
        />
        {/* Alt perde: başlık bloğu fotoğrafın üstüne oturuyor. */}
        <LinearGradient
          colors={["rgba(18,18,20,0.45)", "transparent", "rgba(18,18,20,0.98)"]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[StyleSheet.absoluteFill, stiller.karartma, karartmaStili]} />
      </Animated.View>

      {/* Yapışkan üst çubuk — fotoğraf çıkarken beliriyor. */}
      <Animated.View
        style={[stiller.cubuk, { height: cubukYuksekligi }, cubukStili]}
        pointerEvents="none"
      >
        <CamYuzey yogunluk={70} stil={StyleSheet.absoluteFill}>
          <View style={[stiller.cubukIcerik, { paddingTop: ustBosluk }]}>
            <Text style={stiller.cubukBasligi} numberOfLines={1}>
              {ad}
            </Text>
          </View>
        </CamYuzey>
        <View style={stiller.cubukCizgisi} />
      </Animated.View>

      {/* Yüzen düğmeler her zaman üstte: çubuk belirse de kaybolmuyorlar. */}
      <View style={[stiller.dugmeSatiri, { top: ustBosluk + bosluk.s }]}>
        <YuzenDugme etiket="Geri" yol="M15 19l-7-7 7-7" onPress={onGeri} />
        {onPaylas ? (
          <YuzenDugme
            etiket="Paylaş"
            yol="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14"
            onPress={onPaylas}
          />
        ) : null}
      </View>
    </>
  );
}

function YuzenDugme({
  etiket,
  yol,
  onPress,
}: {
  etiket: string;
  /** SVG path verisi — 24x24 kutuda. */
  yol: string;
  onPress: () => void;
}) {
  return (
    <Basilabilir
      onPress={onPress}
      olcek={0.88}
      style={stiller.yuzenDugme}
      accessibilityRole="button"
      accessibilityLabel={etiket}
    >
      <CamYuzey yogunluk={40} stil={[StyleSheet.absoluteFill, stiller.ortala]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d={yol}
            stroke={renkler.metin.ana}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </CamYuzey>
    </Basilabilir>
  );
}

const stiller = StyleSheet.create({
  kapakKabi: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: KAPAK_YUKSEKLIGI,
    backgroundColor: renkler.katman,
  },
  karartma: { backgroundColor: renkler.zemin },
  cubuk: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    overflow: "hidden",
  },
  cubukIcerik: { flex: 1, alignItems: "center", justifyContent: "center" },
  ortala: { alignItems: "center", justifyContent: "center" },
  cubukBasligi: {
    fontFamily: fontlar.yariKalin,
    fontSize: 16,
    color: renkler.metin.ana,
    maxWidth: "62%",
  },
  cubukCizgisi: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: renkler.cizgi,
  },
  dugmeSatiri: {
    position: "absolute",
    left: bosluk.l,
    right: bosluk.l,
    zIndex: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yuzenDugme: {
    width: 40,
    height: 40,
    minHeight: 40,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
    // Buzlu cam Android'de daha zayıf; altına koyu bir taban koyuyoruz.
    backgroundColor: Platform.OS === "android" ? renkler.camKoyu : "transparent",
  },
});
