import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, isima, golge } from "../../tasarim";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import type { Rozet } from "../../api/tipler";

/** Rozet anahtarına göre simge — backend yalnızca ad/açıklama gönderiyor. */
const ROZET_SIMGELERI: Record<string, string> = {
  ilkAdim: "👣",
  kahveGurmesi: "☕",
  geceKusu: "🦉",
  ustaKasif: "🧭",
  mudavim: "🏅",
};

/**
 * Rozet vitrini.
 *
 * "Vitrin" kelimesi tasarımın tamamını özetliyor: bu bir veri ızgarası
 * değil, kazanılmış şeylerin sergilendiği yer. Bu yüzden kazanılan ve
 * kazanılmayan rozetler AYNI kutuda farklı opaklıkla değil, iki ayrı
 * görsel dilde duruyor —
 *
 *   kazanılan  : sıcak amber gradyan zemin + dışa vuran ışıma + nefes
 *                alan (hafifçe parlayıp sönen) bir animasyon
 *   kilitli    : düz koyu yüzey, gri simge, kilit rozeti
 *
 * Kilitliyi tamamen gizlemek de mümkündü ama o zaman "sırada ne var"
 * görünmezdi; oyunlaştırmanın yarısı bir sonraki hedefi göstermektir.
 */
export function RozetVitrini({ rozetler }: { rozetler: Rozet[] }) {
  const kazanilan = rozetler.filter((r) => r.kazanildi).length;

  return (
    <View style={{ gap: bosluk.m }}>
      <View style={stiller.baslikSatiri}>
        <Text style={yazi.bolumBasligi}>Rozet vitrini</Text>
        <View style={stiller.sayacRozeti}>
          <Text style={stiller.sayacMetni}>
            {kazanilan}/{rozetler.length}
          </Text>
        </View>
      </View>

      <View style={stiller.izgara}>
        {rozetler.map((rozet, sira) => (
          <RozetKarti key={rozet.anahtar} rozet={rozet} sira={sira} />
        ))}
      </View>
    </View>
  );
}

function RozetKarti({ rozet, sira }: { rozet: Rozet; sira: number }) {
  const nefes = useSharedValue(0);

  useEffect(() => {
    if (!rozet.kazanildi) return;
    // Sıralı gecikme: rozetler aynı anda değil, soldan sağa dalga hâlinde
    // parlıyor — hepsi birden yanıp sönerse dikkat dağıtan bir disko
    // etkisi oluyor.
    nefes.value = withDelay(
      sira * 220,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [rozet.kazanildi, sira, nefes]);

  const isimaStili = useAnimatedStyle(() => ({
    opacity: interpolate(nefes.value, [0, 1], [0.45, 0.95]),
    transform: [{ scale: interpolate(nefes.value, [0, 1], [1, 1.06]) }],
  }));

  const kazanildi = rozet.kazanildi;

  return (
    <Animated.View
      // Liste tek tek aşağıdan yükselerek geliyor: hepsi birden belirmek
      // "ekran yüklendi" der, sırayla gelmek "işte kazandıkların" der.
      entering={FadeInDown.delay(sira * 70).duration(420).springify().damping(16)}
      style={stiller.kartSarmal}
    >
      <Basilabilir
        titresim={kazanildi ? "basari" : "hafif"}
        olcek={0.94}
        style={[
          stiller.kart,
          kazanildi ? golge("m", renkler.odul) : golge("s"),
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${rozet.ad}. ${rozet.aciklama} ${
          kazanildi ? "Kazanıldı." : "Henüz kazanılmadı."
        }`}
      >
        {kazanildi ? (
          <>
            {/* Kartın kendi zemini: amberden sıcak koyuya inen gradyan. */}
            <LinearGradient
              colors={["rgba(245,165,36,0.28)", "rgba(245,165,36,0.06)"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Simgenin ardındaki nefes alan ışıma. */}
            <Animated.View style={[stiller.isimaKuresi, isima(renkler.odul, "guclu"), isimaStili]} />
          </>
        ) : null}

        <Text style={[stiller.simge, !kazanildi && stiller.simgeKilitli]}>
          {ROZET_SIMGELERI[rozet.anahtar] ?? "🏅"}
        </Text>

        <Text
          style={[stiller.rozetAdi, !kazanildi && { color: renkler.metin.soluk }]}
          numberOfLines={2}
        >
          {rozet.ad}
        </Text>

        {kazanildi ? (
          <Text style={stiller.puanMetni}>+{rozet.puan}</Text>
        ) : (
          <View style={stiller.kilitRozeti}>
            <Text style={stiller.kilitSimgesi}>🔒</Text>
          </View>
        )}
      </Basilabilir>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  baslikSatiri: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sayacRozeti: {
    backgroundColor: renkler.odulSoluk,
    paddingHorizontal: bosluk.m,
    paddingVertical: 4,
    borderRadius: yaricap.tam,
  },
  sayacMetni: {
    ...yazi.kucuk,
    color: renkler.odulParlak,
    fontVariant: ["tabular-nums"],
  },
  izgara: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: bosluk.m,
  },
  kartSarmal: {
    // Üç sütun: 2 boşluk (12px) toplam 24px, kalanın üçte biri.
    width: "31%",
    minWidth: 96,
    flexGrow: 1,
  },
  kart: {
    height: 124,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.s,
    paddingHorizontal: bosluk.s,
    overflow: "hidden",
  },
  isimaKuresi: {
    position: "absolute",
    top: 22,
    width: 44,
    height: 44,
    borderRadius: yaricap.tam,
    backgroundColor: "rgba(245,165,36,0.35)",
  },
  simge: { fontSize: 30, lineHeight: 36 },
  simgeKilitli: { opacity: 0.32 },
  rozetAdi: {
    ...yazi.kucuk,
    color: renkler.metin.ana,
    textAlign: "center",
    fontWeight: "600",
  },
  puanMetni: {
    ...yazi.kucuk,
    color: renkler.odulParlak,
    fontVariant: ["tabular-nums"],
  },
  kilitRozeti: {
    width: 20,
    height: 20,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
    alignItems: "center",
    justifyContent: "center",
  },
  kilitSimgesi: { fontSize: 9, lineHeight: 12 },
});
