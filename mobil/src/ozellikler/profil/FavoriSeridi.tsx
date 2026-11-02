import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Gorsel } from "../../bilesenler/Gorsel";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { renkler, yazi, bosluk, yaricap } from "../../tasarim";
import type { FavoriMekan } from "../../store/favoriler";

/**
 * Profildeki favori mekan şeridi.
 *
 * Favorileme uygulamada YAPILABİLİYOR ama görülemiyordu: kullanıcı mekan
 * sayfasında kalbe basıyor, sonra o listeye ulaşacak hiçbir yer
 * bulamıyordu. Kaydedilen ama geri dönülemeyen bir liste, kaydetmemekle
 * aynı şey.
 *
 * Boş durumda şerit HİÇ ÇİZİLMİYOR (bileşen null dönüyor). "Henüz favorin
 * yok" kutusu, profili ilk açan herkese boş bir raf göstermek olurdu;
 * favoriler kendini mekan sayfasında zaten tanıtıyor.
 */
export function FavoriSeridi({ mekanlar }: { mekanlar: FavoriMekan[] }) {
  const router = useRouter();
  if (mekanlar.length === 0) return null;

  return (
    <View style={{ gap: bosluk.m }}>
      <Text style={yazi.bolumBasligi}>❤️ Favori mekanlarım</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: bosluk.m, paddingRight: bosluk.xl }}
      >
        {mekanlar.map((mekan) => (
          <Basilabilir
            key={mekan.id}
            onPress={() => router.push(`/mekan/${mekan.slug}`)}
            style={stiller.oge}
            olcek={0.94}
            accessibilityRole="button"
            accessibilityLabel={mekan.ad}
          >
            <View style={stiller.gorsel}>
              <Gorsel
                kaynak={mekan.logoUrl}
                markaRengi={mekan.markaRengi ?? renkler.vurgu}
                stil={StyleSheet.absoluteFill}
              />
            </View>
            {/* İki satıra kadar: tek satırda "Anadolu Kavağı Balık
                Lokantası" gibi adlar üç harfte kesiliyordu. */}
            <Text style={stiller.ad} numberOfLines={2}>
              {mekan.ad}
            </Text>
          </Basilabilir>
        ))}
      </ScrollView>
    </View>
  );
}

const stiller = StyleSheet.create({
  oge: { width: 76, minHeight: 0, alignItems: "center", gap: bosluk.s },
  gorsel: {
    width: 64,
    height: 64,
    borderRadius: yaricap.l,
    overflow: "hidden",
    backgroundColor: renkler.katmanYuksek,
  },
  ad: { ...yazi.kucuk, fontSize: 11, textAlign: "center", color: renkler.metin.govde },
});
