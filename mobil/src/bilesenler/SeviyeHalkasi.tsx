import { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { renkler, isima } from "../tasarim";

const AnimasyonluDaire = Animated.createAnimatedComponent(Circle);

/**
 * Avatarı saran, seviye ilerlemesini gösteren dairesel halka.
 *
 * İlerleme bir yüzde metni olarak da yazılabilirdi ama halka, avatarın
 * ZATEN olduğu yeri kullanıyor: yeni bir satır açmadan, profilin en çok
 * bakılan noktasına "seviye atlamana şu kadar kaldı" bilgisini
 * yerleştiriyor.
 *
 * Animasyon `strokeDashoffset` üzerinden ve UI thread'inde: sayfa
 * açılırken 0'dan gerçek değere doğru dolması, ilerlemenin kazanılmış
 * bir şey olduğu hissini veriyor (dolu bir halka statik bir süstür).
 */
export function SeviyeHalkasi({
  yuzde,
  boyut = 84,
  kalinlik = 5,
  children,
}: {
  /** 0-1 arası. */
  yuzde: number;
  boyut?: number;
  kalinlik?: number;
  children?: React.ReactNode;
}) {
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const ilerleme = useSharedValue(0);

  useEffect(() => {
    ilerleme.value = withTiming(Math.max(0, Math.min(1, yuzde)), {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [yuzde, ilerleme]);

  const animasyonluOzellikler = useAnimatedProps(() => ({
    strokeDashoffset: cevre * (1 - ilerleme.value),
  }));

  return (
    <View style={{ width: boyut, height: boyut, alignItems: "center", justifyContent: "center" }}>
      <Svg width={boyut} height={boyut} style={{ position: "absolute" }}>
        <Defs>
          <SvgGradient id="seviye" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={renkler.vurguParlak} />
            <Stop offset="1" stopColor={renkler.odul} />
          </SvgGradient>
        </Defs>
        {/* Kalan yol — dolu kısmın nereye kadar gideceğini gösteriyor. */}
        <Circle
          cx={boyut / 2}
          cy={boyut / 2}
          r={r}
          stroke={renkler.katmanYuksek}
          strokeWidth={kalinlik}
          fill="none"
        />
        <AnimasyonluDaire
          cx={boyut / 2}
          cy={boyut / 2}
          r={r}
          stroke="url(#seviye)"
          strokeWidth={kalinlik}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={cevre}
          animatedProps={animasyonluOzellikler}
          // Saat 12'den başlasın: sağdan başlayan bir yay, "ne kadar
          // dolduğu" sorusunu gözle ölçülemez hâle getiriyor.
          transform={`rotate(-90 ${boyut / 2} ${boyut / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Çizgisel ilerleme — "sonraki seviyeye X puan" gibi ikincil ölçüler. */
export function IlerlemeCubugu({
  yuzde,
  renk = renkler.vurgu,
  yukseklik = 6,
}: {
  yuzde: number;
  renk?: string;
  yukseklik?: number;
}) {
  const ilerleme = useSharedValue(0);

  useEffect(() => {
    ilerleme.value = withTiming(Math.max(0, Math.min(1, yuzde)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [yuzde, ilerleme]);

  const dolgu = useAnimatedStyle(() => ({
    width: `${ilerleme.value * 100}%`,
  }));

  return (
    <View
      style={{
        height: yukseklik,
        borderRadius: yukseklik / 2,
        backgroundColor: renkler.katmanYuksek,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          { height: "100%", borderRadius: yukseklik / 2, backgroundColor: renk },
          isima(renk),
          dolgu,
        ]}
      />
    </View>
  );
}
