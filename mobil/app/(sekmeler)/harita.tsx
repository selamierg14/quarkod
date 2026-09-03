import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk, yaricap, SEKME_YUKSEKLIGI } from "../../src/tasarim";
import { BosDurum } from "../../src/bilesenler/BosDurum";

/**
 * Harita sekmesi — YER TUTUCU.
 *
 * Gerçek harita `react-native-maps` (veya Mapbox) gerektiriyor ve ikisi
 * de Expo Go'da çalışmayan native modüller: bir "development build"
 * (`npx expo run:ios` / EAS Build) şart. Bu turda iskelet + tasarım
 * sistemi teslim edildiği için harita, kurulum kararı verildikten sonra
 * eklenecek — yarım çalışan bir harita koymak, ilk açılışta kırmızı
 * hata ekranı demek olurdu.
 *
 * Hazır olan taraf: pin rengi/simgesi kuralları `src/tasarim/renkler.ts`
 * içinde (web sürümüyle aynı dil), mekan verisi `/api/app/mekanlar`
 * üzerinden koordinatlarıyla birlikte zaten geliyor.
 */
export default function HaritaEkrani() {
  const guvenliAlan = useSafeAreaInsets();

  return (
    <View style={[stiller.kap, { paddingTop: guvenliAlan.top + bosluk.l }]}>
      <Text style={[yazi.ekranBasligi, { paddingHorizontal: bosluk.xl }]}>Harita</Text>

      <View style={{ flex: 1, justifyContent: "center", paddingBottom: SEKME_YUKSEKLIGI }}>
        <BosDurum
          cizim="rota"
          baslik="Harita bir sonraki adımda"
          aciklama="Native harita (react-native-maps) Expo Go'da çalışmıyor; development build alındığında koyu tema stili ve özel pinlerle burada olacak."
        />
      </View>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
});
