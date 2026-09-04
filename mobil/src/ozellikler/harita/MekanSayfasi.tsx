import { useEffect } from "react";
import { View, Text, StyleSheet, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  renkler,
  yazi,
  bosluk,
  yaricap,
  golge,
  turRenkleri,
  turSimgeleri,
  SEKME_YUKSEKLIGI,
} from "../../tasarim";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import type { MekanOzet } from "../../api/tipler";

/**
 * Pin'e dokununca alttan çıkan mekan kartı.
 *
 * Yeni bir ekrana gitmek yerine alttan açılan bir panel: kullanıcı
 * haritadaki yerini kaybetmiyor, karta bakıp kapatınca aynı noktada
 * kalıyor. Tam ekran bir detay sayfası, "şuradaki üç mekana da bakayım"
 * akışını her seferinde geri tuşuna basmaya çeviriyordu.
 *
 * Giriş/çıkış `withTiming` + yumuşama eğrisiyle: panel yalnızca
 * belirmiyor, aşağıdan yukarı kayarak geliyor — nereden geldiği
 * görüldüğü için kapatıldığında nereye gittiği de belli oluyor.
 */
export function MekanSayfasi({
  mekan,
  onKapat,
}: {
  mekan: MekanOzet | null;
  onKapat: () => void;
}) {
  const guvenliAlan = useSafeAreaInsets();
  const acilma = useSharedValue(0);

  useEffect(() => {
    acilma.value = withTiming(mekan ? 1 : 0, {
      duration: mekan ? 320 : 220,
      easing: mekan ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    });
  }, [mekan, acilma]);

  const animasyon = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - acilma.value) * 260 }],
    opacity: acilma.value,
  }));

  // Kapanma animasyonu bitene kadar son mekan ekranda kalmalı; `mekan`
  // null olur olmaz sökülürse panel kayarak değil, aniden yok oluyor.
  if (!mekan) return null;

  const turRengi = turRenkleri[mekan.tur] ?? renkler.vurgu;
  const etkinlik = mekan.etkinlikler[0] ?? null;

  return (
    <Animated.View
      style={[
        stiller.kap,
        { bottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + bosluk.m },
        golge("l"),
        animasyon,
      ]}
      accessibilityViewIsModal
    >
      <LinearGradient
        colors={[`${turRengi}2E`, "rgba(26,26,30,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Tutamak: panelin sürüklenebilir/kapatılabilir olduğunu söyleyen
          evrensel işaret. */}
      <View style={stiller.tutamak} />

      <View style={stiller.ustSatir}>
        <View style={[stiller.turRozeti, { backgroundColor: `${turRengi}26` }]}>
          <Text style={stiller.turSimgesi}>{turSimgeleri[mekan.tur] ?? "📍"}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={yazi.kartBasligi} numberOfLines={1}>
            {mekan.ad}
          </Text>
          <Text style={yazi.kucuk} numberOfLines={1}>
            {mekan.puan !== null
              ? `⭐ ${mekan.puan.toFixed(1)} · ${mekan.degerlendirmeSayisi} değerlendirme`
              : "Henüz puan yok"}
            {mekan.mesafeMetre !== null ? `  ·  ${mesafeYazisi(mekan.mesafeMetre)}` : ""}
          </Text>
        </View>

        <Basilabilir style={stiller.kapatButonu} onPress={onKapat} accessibilityLabel="Kapat">
          <Text style={stiller.kapatSimgesi}>✕</Text>
        </Basilabilir>
      </View>

      {etkinlik ? (
        <View style={stiller.etkinlik}>
          <Text style={stiller.etkinlikMetni} numberOfLines={1}>
            🔥 {etkinlik.baslik}
          </Text>
        </View>
      ) : null}

      <View style={stiller.butonlar}>
        <Basilabilir
          style={[stiller.buton, stiller.butonIkincil]}
          titresim="hafif"
          onPress={() => {
            const { enlem, boylam } = mekan.konum;
            if (enlem === null || boylam === null) return;
            // Apple Haritalar / Google Haritalar: platformun kendi
            // uygulamasını açmak, gömülü bir yol tarifi çizmekten hem
            // daha doğru hem de kullanıcının alışık olduğu yol.
            const adres = Platform.select({
              ios: `http://maps.apple.com/?daddr=${enlem},${boylam}`,
              default: `https://www.google.com/maps/dir/?api=1&destination=${enlem},${boylam}`,
            });
            void Linking.openURL(adres);
          }}
        >
          <Text style={yazi.buton}>Yol tarifi</Text>
        </Basilabilir>

        <Basilabilir
          style={[stiller.buton, { backgroundColor: renkler.vurgu }]}
          titresim="orta"
          onPress={onKapat}
        >
          <Text style={yazi.buton}>Detay</Text>
        </Basilabilir>
      </View>
    </Animated.View>
  );
}

function mesafeYazisi(metre: number): string {
  return metre < 1000 ? `${Math.round(metre)} m` : `${(metre / 1000).toFixed(1)} km`;
}

const stiller = StyleSheet.create({
  kap: {
    position: "absolute",
    left: bosluk.l,
    right: bosluk.l,
    backgroundColor: renkler.katman,
    borderRadius: yaricap.xl,
    paddingHorizontal: bosluk.l,
    paddingBottom: bosluk.l,
    paddingTop: bosluk.s,
    gap: bosluk.m,
    overflow: "hidden",
  },
  tutamak: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.cizgiBelirgin,
  },
  ustSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.m },
  turRozeti: {
    width: 42,
    height: 42,
    borderRadius: yaricap.m,
    alignItems: "center",
    justifyContent: "center",
  },
  turSimgesi: { fontSize: 19, lineHeight: 24 },
  kapatButonu: {
    width: 32,
    height: 32,
    minHeight: 32,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: renkler.katmanYuksek,
  },
  kapatSimgesi: { color: renkler.metin.soluk, fontSize: 13, lineHeight: 16 },
  etkinlik: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.16)",
    paddingHorizontal: bosluk.m,
    paddingVertical: 5,
    borderRadius: yaricap.tam,
  },
  etkinlikMetni: { ...yazi.kucuk, color: renkler.basari },
  butonlar: { flexDirection: "row", gap: bosluk.m },
  buton: {
    flex: 1,
    minHeight: 46,
    borderRadius: yaricap.m,
    alignItems: "center",
    justifyContent: "center",
  },
  butonIkincil: { backgroundColor: renkler.katmanYuksek },
});
