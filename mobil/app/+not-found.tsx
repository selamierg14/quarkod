import { View, Text, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { renkler, yazi, bosluk } from "../src/tasarim";
import { AnaDugme } from "../src/bilesenler/Form";

/**
 * Tanınmayan yol.
 *
 * Bu dosya yokken Expo Router kendi geliştirici sayfasını gösteriyordu:
 * İngilizce "Unmatched Route" başlığı ve "Sitemap" bağlantısı. Eski bir
 * paylaşım bağlantısı ya da yanlış bir bildirim yolu kullanıcıyı oraya
 * düşürüyor ve uygulamadan çıkış yolu göstermiyordu.
 */
export default function BulunamadiEkrani() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: "Bulunamadı" }} />
      <View style={stiller.kap}>
        <Text style={{ fontSize: 44 }}>🧭</Text>
        <Text style={[yazi.ekranBasligi, { textAlign: "center" }]}>Burası boş çıktı</Text>
        <Text style={[yazi.govde, { textAlign: "center" }]}>
          Aradığın sayfa taşınmış ya da hiç olmamış olabilir.
        </Text>
        <View style={{ alignSelf: "stretch" }}>
          <AnaDugme metin="Keşfet'e dön" onPress={() => router.replace("/kesfet")} />
        </View>
      </View>
    </>
  );
}

const stiller = StyleSheet.create({
  kap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.m,
    padding: bosluk.xl,
    backgroundColor: renkler.zemin,
  },
});
