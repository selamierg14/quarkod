import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, golge, isima, SEKME_YUKSEKLIGI } from "../../src/tasarim";
import { useVeri } from "../../src/api/useVeri";
import type { CuzdanYaniti } from "../../src/api/tipler";
import { useOturum } from "../../src/store/oturum";
import { Iskelet } from "../../src/bilesenler/Iskelet";
import { BosDurum } from "../../src/bilesenler/BosDurum";

export default function CuzdanEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const durum = useOturum((s) => s.durum);
  const { veri, yenileniyor, yenile } = useVeri<CuzdanYaniti>("/api/app/cuzdan", {
    jetonlu: true,
    etkin: durum === "girisli",
  });

  const ustBosluk = guvenliAlan.top + bosluk.l;

  if (durum === "cikisli") {
    return (
      <View style={[stiller.kap, { paddingTop: ustBosluk }]}>
        <Text style={[yazi.ekranBasligi, { paddingHorizontal: bosluk.xl }]}>Cüzdanım</Text>
        <BosDurum
          cizim="cuzdan"
          baslik="Cüzdanın seni bekliyor"
          aciklama="Giriş yap; kuponların, sadakat kartların ve kazandığın her şey burada toplansın."
          butonMetni="Giriş yap"
          onButon={() => router.push("/giris")}
        />
      </View>
    );
  }

  const yukleniyor = durum === "yukleniyor" || !veri;
  const kuponVar = (veri?.kuponlar.length ?? 0) > 0;
  const kartVar = (veri?.sadakatKartlari.length ?? 0) > 0;

  return (
    <ScrollView
      style={stiller.kap}
      contentContainerStyle={{
        paddingTop: ustBosluk,
        paddingBottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + bosluk.xxl,
        gap: bosluk.xl,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={yenile}
          tintColor={renkler.vurguParlak}
        />
      }
    >
      <Text style={[yazi.ekranBasligi, { paddingHorizontal: bosluk.xl }]}>Cüzdanım</Text>

      {yukleniyor ? (
        <View style={{ paddingHorizontal: bosluk.xl, gap: bosluk.l }}>
          <Iskelet yukseklik={120} kose={yaricap.xl} />
          <Iskelet yukseklik={120} kose={yaricap.xl} />
        </View>
      ) : !kuponVar && !kartVar ? (
        <BosDurum
          cizim="cuzdan"
          baslik="Henüz kuponun yok"
          aciklama="Mekanları keşfet, masadaki karekodu okut; her doğrulanmış ziyaret seni ücretsiz kahveye yaklaştırır."
          butonMetni="Hemen keşfet"
          onButon={() => router.push("/kesfet")}
        />
      ) : (
        <View style={{ gap: bosluk.xxl }}>
          {kuponVar ? (
            <View style={stiller.bolum}>
              <Text style={yazi.bolumBasligi}>Aktif kuponlar</Text>
              {veri!.kuponlar.map((kupon, sira) => (
                <Animated.View
                  key={kupon.id}
                  entering={FadeInDown.delay(sira * 70).duration(400).springify()}
                  style={[stiller.kuponKarti, isima(renkler.odul)]}
                >
                  <Text style={stiller.kuponBaslik}>{kupon.indirim}</Text>
                  <Text style={yazi.kucuk}>{kupon.mekan.ad}</Text>
                  <View style={stiller.kod}>
                    <Text style={stiller.kodMetni}>{kupon.kod}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : null}

          {kartVar ? (
            <View style={stiller.bolum}>
              <Text style={yazi.bolumBasligi}>Sadakat kartların</Text>
              {veri!.sadakatKartlari.map((kart, sira) => (
                <Animated.View
                  key={kart.mekan.id}
                  entering={FadeInDown.delay(sira * 70).duration(400).springify()}
                  style={[stiller.sadakatKarti, golge("m")]}
                >
                  <View style={{ gap: 2 }}>
                    <Text style={yazi.kartBasligi}>{kart.mekan.ad}</Text>
                    <Text style={yazi.kucuk}>
                      {kart.kalanZiyaret > 0
                        ? `${kart.kalanZiyaret} ziyaret sonra ücretsiz kahve!`
                        : "Hediyeni almaya hazırsın 🎉"}
                    </Text>
                  </View>
                  <View style={stiller.damgalar}>
                    {Array.from({ length: kart.esik }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          stiller.damga,
                          i < kart.damgaSayisi && stiller.damgaDolu,
                          i < kart.damgaSayisi && isima(renkler.odul),
                        ]}
                      >
                        <Text style={{ fontSize: 11, opacity: i < kart.damgaSayisi ? 1 : 0.25 }}>
                          ☕
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  bolum: { paddingHorizontal: bosluk.xl, gap: bosluk.m },
  kuponKarti: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.xl,
    padding: bosluk.l,
    gap: bosluk.s,
  },
  kuponBaslik: { ...yazi.kartBasligi, color: renkler.odulParlak },
  kod: {
    alignSelf: "flex-start",
    backgroundColor: renkler.odulSoluk,
    paddingHorizontal: bosluk.m,
    paddingVertical: 6,
    borderRadius: yaricap.s,
  },
  kodMetni: { ...yazi.kucuk, color: renkler.odulParlak, letterSpacing: 1.4 },
  sadakatKarti: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.xl,
    padding: bosluk.l,
    gap: bosluk.m,
  },
  damgalar: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.s },
  damga: {
    width: 30,
    height: 30,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
    alignItems: "center",
    justifyContent: "center",
  },
  damgaDolu: { backgroundColor: renkler.odul },
});
