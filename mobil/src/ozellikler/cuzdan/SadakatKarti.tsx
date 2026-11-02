import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, golge, isima, fontlar } from "../../tasarim";

type Kart = {
  mekan: { id: string; ad: string };
  toplamZiyaret: number;
  damgaSayisi: number;
  esik: number;
  kalanZiyaret: number;
  hediyeKazanildiMi: boolean;
};

/**
 * Sadakat kartı — kahveci damga kartının dijital hâli.
 *
 * Damgalar tek tek, SIRAYLA basılıyor (her biri bir öncekinden 60 ms
 * sonra, yaylı bir sıçramayla). Hepsinin aynı anda belirmesi bir durum
 * göstergesi; sırayla basılması ise kullanıcının o damgaları TEK TEK
 * kazandığını hatırlatan küçük bir kutlama. Ekranın en çok bakılan
 * yerinde iki saniyelik bu fark, "biriktiriyorum" hissini kuran şey.
 *
 * Hediye hak edildiğinde kart altın kenarlığa ve ışımaya geçiyor:
 * "hazırsın" bilgisini metinden önce renk söylüyor.
 */
export function SadakatKarti({ kart, sira = 0 }: { kart: Kart; sira?: number }) {
  const hazir = kart.hediyeKazanildiMi;

  // Sunucu, eşiği dolduran turda damgayı SIFIRA çeviriyor (10 % 10 = 0;
  // bkz. lib/sadakat.ts) — yeni tur başlıyor. Ama kartı boş çizip
  // "hediyeni almaya hazırsın" demek kendi kendini yalanlıyordu:
  // kullanıcı on kahve içmiş, karşısında bomboş bir kart görüyordu.
  // Hediye kazanılan turda kart DOLU gösteriliyor; bir sonraki ziyaret
  // zaten 1/10 ile yeni turu başlatıyor.
  const doluDamga = hazir ? kart.esik : kart.damgaSayisi;

  return (
    <View
      style={[
        stiller.kap,
        golge("m"),
        hazir && stiller.kapHazir,
        hazir && isima(renkler.odul),
      ]}
    >
      <LinearGradient
        colors={
          hazir
            ? ["rgba(245,165,36,0.24)", "rgba(245,165,36,0.03)"]
            : ["rgba(124,107,255,0.16)", "rgba(124,107,255,0.02)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={stiller.ust}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={yazi.kartBasligi} numberOfLines={1}>
            {kart.mekan.ad}
          </Text>
          <Text style={[yazi.kucuk, hazir && { color: renkler.odulParlak }]}>
            {hazir
              ? "Kart doldu — kuponun cüzdanında 🎉"
              : `${kart.kalanZiyaret} ziyaret sonra ücretsiz kahve`}
          </Text>
        </View>
        <View style={stiller.sayac}>
          <Text style={stiller.sayacMetni}>
            {doluDamga}
            <Text style={stiller.sayacEsik}>/{kart.esik}</Text>
          </Text>
        </View>
      </View>

      <ParlamaEfekti etkin={hazir} />

      <View style={stiller.damgalar}>
        {Array.from({ length: kart.esik }, (_, i) => (
          <Damga key={i} dolu={i < doluDamga} gecikme={sira * 120 + i * 60} />
        ))}
      </View>
    </View>
  );
}

function Damga({ dolu, gecikme }: { dolu: boolean; gecikme: number }) {
  const basim = useSharedValue(dolu ? 0 : 1);

  useEffect(() => {
    if (!dolu) return;
    // Damga yukarıdan "basılıyor": önce büyük ve saydam, sonra yerine oturuyor.
    basim.value = withDelay(gecikme, withSpring(1, { damping: 11, stiffness: 180 }));
  }, [dolu, gecikme, basim]);

  const animasyon = useAnimatedStyle(() => ({
    opacity: dolu ? basim.value : 1,
    transform: [{ scale: dolu ? 1.45 - basim.value * 0.45 : 1 }],
  }));

  return (
    <Animated.View style={[stiller.damga, dolu && stiller.damgaDolu, animasyon]}>
      <Text style={[stiller.damgaSimgesi, !dolu && stiller.damgaBosSimge]}>☕</Text>
    </Animated.View>
  );
}

/** Hediye hazır olduğunda kartın üstünden bir kez geçen ışık huzmesi. */
function ParlamaEfekti({ etkin }: { etkin: boolean }) {
  const kayma = useSharedValue(-1);

  useEffect(() => {
    if (!etkin) return;
    kayma.value = withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) });
  }, [etkin, kayma]);

  const animasyon = useAnimatedStyle(() => ({
    opacity: 1 - Math.abs(kayma.value),
    transform: [{ translateX: kayma.value * 220 }, { rotate: "18deg" }],
  }));

  if (!etkin) return null;

  return (
    <Animated.View style={[stiller.parlama, animasyon]} pointerEvents="none">
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.16)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kap: {
    gap: bosluk.m,
    padding: bosluk.l,
    borderRadius: yaricap.xl,
    overflow: "hidden",
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  kapHazir: { borderColor: "rgba(245,165,36,0.5)" },
  ust: { flexDirection: "row", alignItems: "center", gap: bosluk.m },
  sayac: {
    paddingHorizontal: bosluk.m,
    paddingVertical: 5,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
  },
  sayacMetni: {
    fontFamily: fontlar.kalin,
    fontSize: 15,
    color: renkler.metin.ana,
    fontVariant: ["tabular-nums"],
  },
  sayacEsik: { fontFamily: fontlar.normal, fontSize: 12, color: renkler.metin.soluk },
  damgalar: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.s },
  damga: {
    width: 32,
    height: 32,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: renkler.katmanYuksek,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  damgaDolu: { backgroundColor: renkler.odul, borderColor: renkler.odulParlak },
  damgaSimgesi: { fontSize: 13 },
  damgaBosSimge: { opacity: 0.22 },
  parlama: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 70,
  },
});
