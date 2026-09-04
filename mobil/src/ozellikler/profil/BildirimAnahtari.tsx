import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, golge } from "../../tasarim";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import {
  bildirimDurumunuOku,
  bildirimleriAc,
  bildirimleriKapat,
  type BildirimDurumu,
} from "../../push/bildirim";

/**
 * Bildirim izni kartı.
 *
 * İzin açılışta değil BURADA isteniyor: sistemin izin penceresi bir kez
 * reddedilirse bir daha gösterilemiyor, dolayısıyla tek şansı
 * kullanıcının "evet bunu istiyorum" dediği ana bağlamak gerekiyor.
 * Kartın metni ne alacağını da somut söylüyor — "bildirimlere izin ver"
 * değil, "yakınındaki flaş indirimler".
 *
 * `desteklenmiyor` durumu gizlenmiyor, açıklanıyor: Android'de Expo Go
 * uzaktan bildirimi desteklemiyor (development build gerekiyor) ve
 * simülatörde jeton üretilemiyor. Sessizce çalışmayan bir anahtar,
 * bozuk bir anahtardan beterdir.
 */
export function BildirimAnahtari() {
  const [durum, setDurum] = useState<BildirimDurumu>("bilinmiyor");
  const [islemde, setIslemde] = useState(false);

  useEffect(() => {
    let iptal = false;
    void bildirimDurumunuOku().then((d) => {
      if (!iptal) setDurum(d);
    });
    return () => {
      iptal = true;
    };
  }, []);

  async function degistir() {
    setIslemde(true);
    if (durum === "acik") {
      await bildirimleriKapat();
      setDurum("kapali");
    } else {
      setDurum(await bildirimleriAc());
    }
    setIslemde(false);
  }

  const acik = durum === "acik";
  const desteklenmiyor = durum === "desteklenmiyor";

  return (
    <Animated.View entering={FadeInDown.delay(160).duration(400).springify()}>
      <View style={[stiller.kap, golge("m")]}>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text style={yazi.kartBasligi}>Yakınımdaki fırsatlar</Text>
          <Text style={yazi.kucuk}>
            {desteklenmiyor
              ? "Bu cihazda bildirim açılamıyor (Expo Go/simülatör sınırı)."
              : acik
                ? "Yakınındaki flaş indirimlerde bildirim alacaksın."
                : "Yakınında bir mekan flaş indirim başlatınca haberin olsun."}
          </Text>
        </View>

        {islemde ? (
          <ActivityIndicator color={renkler.vurguParlak} />
        ) : (
          <Basilabilir
            style={[stiller.dugme, acik ? stiller.dugmeAcik : stiller.dugmeKapali]}
            onPress={degistir}
            disabled={desteklenmiyor}
            titresim={acik ? "hafif" : "basari"}
            accessibilityRole="switch"
            accessibilityState={{ checked: acik, disabled: desteklenmiyor }}
            accessibilityLabel="Yakınımdaki fırsat bildirimleri"
          >
            <Text style={[yazi.kucuk, acik ? stiller.metinAcik : stiller.metinKapali]}>
              {desteklenmiyor ? "Kapalı" : acik ? "Açık" : "Aç"}
            </Text>
          </Basilabilir>
        )}
      </View>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kap: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    backgroundColor: renkler.katman,
    borderRadius: yaricap.xl,
    padding: bosluk.l,
  },
  dugme: {
    minHeight: 36,
    paddingHorizontal: bosluk.l,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
  },
  dugmeAcik: { backgroundColor: renkler.vurguSoluk },
  dugmeKapali: { backgroundColor: renkler.katmanYuksek },
  metinAcik: { color: renkler.vurguParlak, fontWeight: "600" },
  metinKapali: { color: renkler.metin.govde, fontWeight: "600" },
});
