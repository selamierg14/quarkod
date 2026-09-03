import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { DOKUNMA_ALANI } from "../tasarim";

const AnimasyonluPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  /** Basıldığında küçülme oranı. Büyük kartlarda daha az, butonlarda daha çok. */
  olcek?: number;
  /** Dokunsal geri bildirim şiddeti. `yok` ile kapatılabilir. */
  titresim?: "hafif" | "orta" | "basari" | "yok";
  children: React.ReactNode;
};

/**
 * Basılabilir her şeyin ortak zemini: yay animasyonlu küçülme + haptik.
 *
 * Native'in kendi `TouchableOpacity` solması, bir mobil uygulamada "ucuz"
 * duran ilk detay — parmağın altındaki şey ekrana gömülmüyor, sadece
 * soluyor. Yay (spring) ile hafifçe küçülüp geri gelmek, dokunuşun
 * fiziksel bir karşılığı olduğu hissini veriyor. Titreşim ise onayı
 * gözle değil parmakla iletiyor: kullanıcı ekrana bakmadan da bastığını
 * anlıyor.
 *
 * Animasyon UI thread'inde (Reanimated worklet) çalışıyor; JS thread bir
 * ağ isteğiyle meşgulken bile kare düşmüyor.
 */
export function Basilabilir({
  style,
  olcek = 0.96,
  titresim = "hafif",
  onPressIn,
  onPressOut,
  children,
  ...kalan
}: Props) {
  const basili = useSharedValue(0);

  const animasyon = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - basili.value * (1 - olcek) },
    ],
    opacity: 1 - basili.value * 0.12,
  }));

  return (
    <AnimasyonluPressable
      hitSlop={8}
      style={[{ minHeight: DOKUNMA_ALANI }, style, animasyon]}
      onPressIn={(olay) => {
        basili.value = withSpring(1, { damping: 18, stiffness: 320, mass: 0.4 });
        if (titresim !== "yok") {
          const tur =
            titresim === "orta"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
          if (titresim === "basari") {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            void Haptics.impactAsync(tur);
          }
        }
        onPressIn?.(olay);
      }}
      onPressOut={(olay) => {
        basili.value = withSpring(0, { damping: 18, stiffness: 320, mass: 0.4 });
        onPressOut?.(olay);
      }}
      {...kalan}
    >
      {children}
    </AnimasyonluPressable>
  );
}
