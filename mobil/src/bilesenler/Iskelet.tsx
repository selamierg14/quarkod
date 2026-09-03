import { useEffect } from "react";
import { View, type ViewStyle, type StyleProp, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { renkler, yaricap, bosluk } from "../tasarim";

const AnimasyonluGradyan = Animated.createAnimatedComponent(LinearGradient);

/**
 * Yükleniyor iskeleti (skeleton).
 *
 * Spinner yerine iskelet: dönen çark "bir şey oluyor" der ama NE
 * geleceğini söylemez; iskelet, gelecek içeriğin şeklini önceden
 * çizdiği için ekran doldugunda sıçrama (layout shift) olmuyor ve
 * bekleme daha kısa hissediliyor.
 *
 * Parlama, opaklık yakıp söndürmek yerine soldan sağa geçen bir ışık
 * huzmesi — nabız gibi yanıp sönen gri kutular gözü yoruyor.
 */
export function Iskelet({
  genislik = "100%",
  yukseklik = 16,
  kose = yaricap.s,
  stil,
}: {
  genislik?: DimensionValue;
  yukseklik?: number;
  kose?: number;
  stil?: StyleProp<ViewStyle>;
}) {
  const ilerleme = useSharedValue(0);

  useEffect(() => {
    ilerleme.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [ilerleme]);

  const animasyon = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(ilerleme.value, [0, 1], [-220, 220]) }],
  }));

  return (
    <View
      style={[
        {
          width: genislik,
          height: yukseklik,
          borderRadius: kose,
          backgroundColor: renkler.katman,
          overflow: "hidden",
        },
        stil,
      ]}
    >
      <AnimasyonluGradyan
        colors={["transparent", "rgba(255,255,255,0.07)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[{ width: 220, height: "100%" }, animasyon]}
      />
    </View>
  );
}

/** Profil ekranının bekleme hâli — gerçek yerleşimin birebir kopyası. */
export function ProfilIskeleti() {
  return (
    <View style={{ gap: bosluk.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: bosluk.l }}>
        <Iskelet genislik={72} yukseklik={72} kose={yaricap.tam} />
        <View style={{ flex: 1, gap: bosluk.s }}>
          <Iskelet genislik="70%" yukseklik={22} />
          <Iskelet genislik="45%" yukseklik={14} />
        </View>
      </View>
      <Iskelet yukseklik={104} kose={yaricap.xl} />
      <Iskelet yukseklik={132} kose={yaricap.xl} />
      <View style={{ gap: bosluk.m }}>
        <Iskelet genislik="40%" yukseklik={18} />
        <View style={{ flexDirection: "row", gap: bosluk.m }}>
          <Iskelet genislik={104} yukseklik={124} kose={yaricap.l} />
          <Iskelet genislik={104} yukseklik={124} kose={yaricap.l} />
          <Iskelet genislik={104} yukseklik={124} kose={yaricap.l} />
        </View>
      </View>
    </View>
  );
}
