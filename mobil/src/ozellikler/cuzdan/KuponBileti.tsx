import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { renkler, yazi, bosluk, yaricap, golge, isima, fontlar } from "../../tasarim";

const AnimasyonluDaire = Animated.createAnimatedComponent(Circle);

/** Perforasyon çentiğinin çapı. */
const CENTIK = 22;

type Kupon = {
  id: string;
  indirim: string;
  sonKullanma: string | null;
  mekan: { ad: string };
  kod: string;
  kodKalanSaniye: number;
};

/**
 * Kupon — fiziksel bir bilet gibi.
 *
 * Düz bir kart, kuponu ekrandaki diğer kartlardan ayırmıyordu; oysa
 * kupon kullanıcının KAZANDIĞI şey ve cüzdanın tek nedeni. Bilet
 * biçimi (iki yanda çentik, ortada delik sırası) bunu tek bakışta
 * söylüyor — üstelik öğrenilmesi gereken yeni bir görsel dil değil,
 * herkesin sinema biletinden tanıdığı bir şekil.
 *
 * Çentikler SVG maskesiyle değil, ZEMİN RENGİNDE iki daireyle
 * yapılıyor: maske react-native-svg'de Android'de tutarsız çalışıyor ve
 * kartın gradyanını da bozuyordu.
 */
export function KuponBileti({ kupon }: { kupon: Kupon }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function kopyala() {
    await Clipboard.setStringAsync(kupon.kod);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setKopyalandi(true);
  }

  useEffect(() => {
    if (!kopyalandi) return;
    const zamanlayici = setTimeout(() => setKopyalandi(false), 2000);
    return () => clearTimeout(zamanlayici);
  }, [kopyalandi]);

  return (
    <View style={[stiller.kap, golge("m")]}>
      <LinearGradient
        colors={["rgba(245,165,36,0.22)", "rgba(245,165,36,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={stiller.ust}>
        <Text style={stiller.mekan} numberOfLines={1}>
          {kupon.mekan.ad}
        </Text>
        <Text style={stiller.indirim}>{kupon.indirim}</Text>
        {kupon.sonKullanma ? (
          <Text style={yazi.kucuk}>Son kullanma: {tarihMetni(kupon.sonKullanma)}</Text>
        ) : null}
      </View>

      {/* Perforasyon: iki çentik + aradaki kesikli çizgi. */}
      <View style={stiller.perforasyon}>
        <View style={[stiller.centik, stiller.centikSol]} />
        <View style={stiller.kesikliCizgi} />
        <View style={[stiller.centik, stiller.centikSag]} />
      </View>

      <View style={stiller.alt}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={yazi.etiket}>Kasada göster</Text>
          <Basilabilir onPress={kopyala} olcek={0.95} titresim="yok" style={stiller.kodKutusu}>
            <Text style={stiller.kodMetni}>{kupon.kod}</Text>
            <Text style={stiller.kopyala}>{kopyalandi ? "kopyalandı ✓" : "kopyala"}</Text>
          </Basilabilir>
        </View>

        <GeriSayimHalkasi kalanSaniye={kupon.kodKalanSaniye} />
      </View>
    </View>
  );
}

/**
 * Kodun tazeliğini gösteren halka.
 *
 * Kod belirli aralıklarla yenileniyor (sunucu `kodKalanSaniye`
 * gönderiyor). Sayı yazmak yerine boşalan bir halka: kasada telefonu
 * uzatan kullanıcı saniye okumak istemiyor, "hâlâ geçerli mi" sorusunun
 * cevabını bir bakışta istiyor.
 */
function GeriSayimHalkasi({ kalanSaniye }: { kalanSaniye: number }) {
  const boyut = 46;
  const kalinlik = 3.5;
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const ilerleme = useSharedValue(1);

  useEffect(() => {
    const guvenli = Math.max(1, kalanSaniye);
    ilerleme.value = 1;
    ilerleme.value = withTiming(0, { duration: guvenli * 1000, easing: Easing.linear });
  }, [kalanSaniye, ilerleme]);

  const animasyonlu = useAnimatedProps(() => ({
    strokeDashoffset: cevre * (1 - ilerleme.value),
  }));

  return (
    <View style={[{ width: boyut, height: boyut }, isima(renkler.odul)]}>
      <Svg width={boyut} height={boyut}>
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
          stroke={renkler.odul}
          strokeWidth={kalinlik}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={cevre}
          animatedProps={animasyonlu}
          // Saat 12'den başlasın; sağdan başlayan bir geri sayım
          // "ne kadar kaldı" hissi vermiyor.
          transform={`rotate(-90 ${boyut / 2} ${boyut / 2})`}
        />
      </Svg>
      <View style={stiller.halkaIci}>
        <Text style={stiller.halkaMetni}>🎟️</Text>
      </View>
    </View>
  );
}

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

const stiller = StyleSheet.create({
  kap: {
    borderRadius: yaricap.xl,
    overflow: "hidden",
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245,165,36,0.28)",
  },
  ust: { padding: bosluk.l, paddingBottom: bosluk.m, gap: 3 },
  mekan: { ...yazi.kucuk, color: renkler.metin.govde },
  indirim: {
    fontFamily: fontlar.kalin,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: renkler.odulParlak,
  },
  perforasyon: {
    height: CENTIK,
    justifyContent: "center",
  },
  centik: {
    position: "absolute",
    width: CENTIK,
    height: CENTIK,
    borderRadius: yaricap.tam,
    // Zemin rengi: kart bu noktada "delinmiş" görünüyor.
    backgroundColor: renkler.zemin,
  },
  centikSol: { left: -CENTIK / 2 },
  centikSag: { right: -CENTIK / 2 },
  kesikliCizgi: {
    marginHorizontal: CENTIK,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: renkler.cizgiBelirgin,
  },
  alt: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    padding: bosluk.l,
    paddingTop: bosluk.m,
  },
  kodKutusu: {
    minHeight: 0,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: bosluk.s,
    paddingHorizontal: bosluk.m,
    paddingVertical: 7,
    borderRadius: yaricap.s,
    backgroundColor: renkler.odulSoluk,
  },
  kodMetni: {
    fontFamily: fontlar.kalin,
    fontSize: 15,
    letterSpacing: 1.6,
    color: renkler.odulParlak,
  },
  kopyala: { ...yazi.kucuk, fontSize: 10 },
  halkaIci: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  halkaMetni: { fontSize: 15 },
});
