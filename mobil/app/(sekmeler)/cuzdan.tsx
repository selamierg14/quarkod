import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, SEKME_YUKSEKLIGI } from "../../src/tasarim";
import { TARA_DUGMESI_PAYI } from "../../src/bilesenler/TaraDugmesi";
import { useVeri } from "../../src/api/useVeri";
import type { CuzdanYaniti } from "../../src/api/tipler";
import { useOturum } from "../../src/store/oturum";
import { Iskelet } from "../../src/bilesenler/Iskelet";
import { BosDurum } from "../../src/bilesenler/BosDurum";
import { KuponBileti } from "../../src/ozellikler/cuzdan/KuponBileti";
import { SadakatKarti } from "../../src/ozellikler/cuzdan/SadakatKarti";

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
        paddingBottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + TARA_DUGMESI_PAYI,
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
                >
                  <KuponBileti kupon={kupon} />
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
                >
                  <SadakatKarti kart={kart} sira={sira} />
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
});
