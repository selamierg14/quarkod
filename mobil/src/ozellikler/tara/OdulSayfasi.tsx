import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { Konfeti } from "../../bilesenler/Konfeti";
import { renkler, yazi, bosluk, yaricap, isima, golge, fontlar } from "../../tasarim";
import type { ZiyaretYaniti } from "../../api/tipler";

/**
 * Ziyaret doğrulandıktan sonraki ödül ekranı.
 *
 * Uygulamanın tek "kazandın" anı burası: karekodu okutmak dışında puan
 * kazandıran başka bir eylem yok. Bu yüzden ekran bir bildirim değil, bir
 * kutlama — konfeti, sıçrayan puan rozeti ve haptik onay birlikte
 * çalışıyor. Bir toast mesajı aynı bilgiyi verirdi ama uygulamanın
 * tekrar açılma sebebini vermezdi.
 *
 * Sıralama bilinçli: önce ne kazandığı (puan), sonra nerede kazandığı
 * (mekan), sonra varsa ekstralar (rozet, damga, kupon, rota). Kullanıcı
 * ilk yarım saniyede yalnızca ilk satırı okuyor.
 */
export function OdulSayfasi({
  sonuc,
  onKapat,
  onCuzdan,
}: {
  sonuc: ZiyaretYaniti;
  onKapat: () => void;
  onCuzdan: () => void;
}) {
  const rozet = sonuc.yeniRozetler[0] ?? null;
  // `sadakat` sunucudan HİÇ GELMEYEBİLİR: kupon/sadakat özelliği kapalıyken
  // alan gönderilmiyor ve o zaman bu ekranda damga satırı da, kupon satırı
  // da çizilmiyor. Bayrağa değil VERİNİN VARLIĞINA bakıyoruz; böylece
  // özellik sunucudan geri açıldığında uygulamanın yeni bir sürümü
  // gerekmeden yeniden görünüyor.
  const sadakat = sonuc.sadakat ?? null;
  const kupon = sadakat?.kazanilanKupon ?? null;
  const rota = sonuc.tamamlananRotalar[0] ?? null;

  const sicrama = useSharedValue(0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sicrama.value = withSequence(
      withSpring(1.12, { damping: 9, stiffness: 190 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
  }, [sicrama]);

  const puanStili = useAnimatedStyle(() => ({ transform: [{ scale: sicrama.value }] }));

  return (
    <View style={stiller.kap}>
      <Konfeti etkin />

      <ScrollView
        contentContainerStyle={stiller.icerik}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(420).springify()} style={{ alignItems: "center", gap: bosluk.s }}>
          <Animated.View style={[stiller.puanRozeti, isima(renkler.odul, "guclu"), puanStili]}>
            <LinearGradient
              colors={[renkler.odulParlak, renkler.odul]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={stiller.puanSayisi}>+{sonuc.kazanilanPuan}</Text>
            <Text style={stiller.puanEtiketi}>PUAN</Text>
          </Animated.View>

          <Text style={stiller.baslik}>Ziyaretin doğrulandı</Text>
          <Text style={stiller.mekan}>{sonuc.ziyaret.mekanAdi}</Text>
          <Text style={yazi.kucuk}>
            Toplam {sonuc.toplamPuan} puan · Seviye {sonuc.seviye}
          </Text>
        </Animated.View>

        <View style={{ gap: bosluk.m, width: "100%" }}>
          {rozet ? (
            <OdulSatiri
              gecikme={140}
              simge="🏅"
              vurgulu
              baslik={`Yeni rozet: ${rozet.ad}`}
              aciklama={`${rozet.aciklama} (+${rozet.puan} puan)`}
            />
          ) : null}

          {kupon ? (
            <OdulSatiri
              gecikme={220}
              simge="🎟️"
              vurgulu
              baslik="Sadakat kartın doldu!"
              aciklama={`${kupon.indirim} — kuponun cüzdanında.`}
            />
          ) : sadakat ? (
            <OdulSatiri
              gecikme={220}
              simge="☕"
              baslik={`Sadakat kartı ${sadakat.damgaSayisi}/${sadakat.esik}`}
              aciklama={`${sadakat.kalanZiyaret} ziyaret sonra ücretsiz kahve.`}
            />
          ) : null}

          {rota ? (
            <OdulSatiri
              gecikme={300}
              simge="🗺️"
              vurgulu
              baslik={`Rota tamamlandı: ${rota.ad}`}
              aciklama={`+${sonuc.rotaTamamlamaPuani} bonus puan.`}
            />
          ) : null}
        </View>

        <View style={{ gap: bosluk.s, width: "100%" }}>
          {kupon ? (
            <Basilabilir
              style={[stiller.birincilButon, isima(renkler.vurgu)]}
              onPress={onCuzdan}
              titresim="orta"
            >
              <Text style={yazi.buton}>Kuponu gör</Text>
            </Basilabilir>
          ) : null}
          <Basilabilir style={stiller.ikincilButon} onPress={onKapat} titresim="hafif">
            <Text style={[yazi.buton, !kupon && { color: renkler.metin.ana }]}>
              {kupon ? "Kapat" : "Harika, devam"}
            </Text>
          </Basilabilir>
        </View>
      </ScrollView>
    </View>
  );
}

function OdulSatiri({
  simge,
  baslik,
  aciklama,
  gecikme,
  vurgulu = false,
}: {
  simge: string;
  baslik: string;
  aciklama: string;
  gecikme: number;
  vurgulu?: boolean;
}) {
  const gorunum = useSharedValue(0);

  useEffect(() => {
    gorunum.value = withDelay(gecikme, withTiming(1, { duration: 380 }));
  }, [gecikme, gorunum]);

  const animasyon = useAnimatedStyle(() => ({
    opacity: gorunum.value,
    transform: [{ translateY: (1 - gorunum.value) * 14 }],
  }));

  return (
    <Animated.View
      style={[stiller.odulSatiri, vurgulu && stiller.odulSatiriVurgulu, golge("s"), animasyon]}
    >
      <Text style={stiller.odulSimgesi}>{simge}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={stiller.odulBasligi}>{baslik}</Text>
        <Text style={yazi.kucuk}>{aciklama}</Text>
      </View>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  icerik: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.xxl,
    padding: bosluk.xl,
  },
  puanRozeti: {
    width: 128,
    height: 128,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  puanSayisi: {
    fontFamily: fontlar.kalin,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: renkler.metin.ters,
    fontVariant: ["tabular-nums"],
  },
  puanEtiketi: {
    fontFamily: fontlar.yariKalin,
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(18,18,20,0.65)",
  },
  baslik: { ...yazi.ekranBasligi, fontSize: 24, textAlign: "center" },
  mekan: { ...yazi.bolumBasligi, fontSize: 16, color: renkler.vurguParlak, textAlign: "center" },
  odulSatiri: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  odulSatiriVurgulu: {
    backgroundColor: renkler.odulSoluk,
    borderColor: "rgba(245,165,36,0.4)",
  },
  odulSimgesi: { fontSize: 24 },
  odulBasligi: { ...yazi.kartBasligi },
  birincilButon: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  ikincilButon: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.m,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
  },
});
