import { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import Svg, { Path, Circle } from "react-native-svg";
import { CamYuzey } from "../../src/bilesenler/CamYuzey";
import { renkler, bosluk, yaricap, fontlar, SEKME_YUKSEKLIGI } from "../../src/tasarim";

/**
 * Alt navigasyon — ekranın altında yüzen buzlu cam ada.
 *
 * Kenardan kenara opak bir çubuk yerine yüzen bir ada: içerik altından
 * geçerken görünüyor, uygulama "kat kat" hissediliyor. Aktif sekme
 * soluk griden parlak beyaza geçiyor VE ikonun arkasında renkli bir
 * kapsül beliriyor — yalnızca renk değiştirmek, küçük ikonlarda hangi
 * sekmede olduğunu yeterince anlatmıyordu.
 */
export default function SekmeLayout() {
  const guvenliAlan = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: renkler.zemin },
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          height: SEKME_YUKSEKLIGI + guvenliAlan.bottom,
        },
        tabBarBackground: () => (
          <CamYuzey
            yogunluk={60}
            stil={[
              StyleSheet.absoluteFill,
              {
                borderTopLeftRadius: yaricap.xl,
                borderTopRightRadius: yaricap.xl,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: renkler.cizgi,
              },
            ]}
          />
        ),
      }}
      screenListeners={{
        // Sekme değişimi parmakla da hissedilsin.
        tabPress: () => {
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="kesfet"
        options={{
          tabBarIcon: ({ focused }) => <Sekme ad="Keşfet" aktif={focused} simge="pusula" />,
        }}
      />
      <Tabs.Screen
        name="harita"
        options={{
          tabBarIcon: ({ focused }) => <Sekme ad="Harita" aktif={focused} simge="harita" />,
        }}
      />
      <Tabs.Screen
        name="cuzdan"
        options={{
          tabBarIcon: ({ focused }) => <Sekme ad="Cüzdan" aktif={focused} simge="cuzdan" />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          tabBarIcon: ({ focused }) => <Sekme ad="Profil" aktif={focused} simge="kisi" />,
        }}
      />
    </Tabs>
  );
}

function Sekme({
  ad,
  aktif,
  simge,
}: {
  ad: string;
  aktif: boolean;
  simge: "pusula" | "harita" | "cuzdan" | "kisi";
}) {
  const gecis = useSharedValue(aktif ? 1 : 0);

  // Paylaşılan değere RENDER SIRASINDA yazmak Reanimated'ın açıkça
  // uyardığı bir hata: React ağacı çizilirken UI thread'e dokunmak,
  // eşzamanlı (concurrent) render'da yarım kalmış bir çizimin
  // animasyonu tetiklemesine yol açabiliyor. Yazma efekte alındı.
  useEffect(() => {
    gecis.value = withSpring(aktif ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [aktif, gecis]);

  const kapsul = useAnimatedStyle(() => ({
    opacity: gecis.value,
    transform: [{ scale: interpolate(gecis.value, [0, 1], [0.6, 1]) }],
  }));

  const ikonKap = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(gecis.value, [0, 1], [0, -2]) }],
  }));

  const etiket = useAnimatedStyle(() => ({
    opacity: interpolate(gecis.value, [0, 1], [0.55, 1]),
  }));

  return (
    <View style={stiller.sekme}>
      <Animated.View style={[stiller.kapsul, kapsul]} />
      <Animated.View style={ikonKap}>
        <Ikon ad={simge} renk={aktif ? renkler.vurguParlak : renkler.metin.soluk} />
      </Animated.View>
      <Animated.Text
        style={[stiller.etiket, { color: aktif ? renkler.metin.ana : renkler.metin.soluk }, etiket]}
      >
        {ad}
      </Animated.Text>
    </View>
  );
}

function Ikon({ ad, renk }: { ad: "pusula" | "harita" | "cuzdan" | "kisi"; renk: string }) {
  const ortak = {
    stroke: renk,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {ad === "pusula" ? (
        <>
          <Circle cx="12" cy="12" r="9" {...ortak} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" {...ortak} />
        </>
      ) : null}
      {ad === "harita" ? (
        <>
          <Path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" {...ortak} />
          <Path d="M9 4v13M15 6.5v13" {...ortak} />
        </>
      ) : null}
      {ad === "cuzdan" ? (
        <>
          <Path d="M3 8a2 2 0 012-2h13a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" {...ortak} />
          <Path d="M3 9.5c0-2 1.3-2.8 3-3.2l9.5-2c1.3-.3 2.5.6 2.5 2V8" {...ortak} />
          <Circle cx="16.5" cy="12.5" r="1.4" {...ortak} />
        </>
      ) : null}
      {ad === "kisi" ? (
        <>
          <Circle cx="12" cy="8.5" r="3.7" {...ortak} />
          <Path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5" {...ortak} />
        </>
      ) : null}
    </Svg>
  );
}

const stiller = StyleSheet.create({
  sekme: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    width: 68,
    paddingTop: bosluk.s,
  },
  kapsul: {
    position: "absolute",
    top: 2,
    width: 46,
    height: 30,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.vurguSoluk,
  },
  etiket: {
    fontFamily: fontlar.orta,
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
});
