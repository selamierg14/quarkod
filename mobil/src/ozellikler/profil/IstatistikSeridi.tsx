import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, golge } from "../../tasarim";

/**
 * Üçlü sayaç şeridi (puan / ziyaret / kupon).
 *
 * Üçü tek bir kart içinde ayraçla bölünüyor, üç ayrı kart olarak değil:
 * aynı cümlenin üç kelimesi gibi okunmaları gerekiyor ("100 puan, 12
 * ziyaret, 2 kupon") — ayrı kartlar bunları birbiriyle ilgisiz üç
 * ölçüye çeviriyordu.
 */
export function IstatistikSeridi({
  puan,
  ziyaret,
  kupon,
}: {
  puan: number;
  ziyaret: number;
  kupon: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(400).springify()}>
      <View style={[stiller.kap, golge("m")]}>
        <Sayac deger={puan} etiket="Kaşif Puanı" renk={renkler.odulParlak} />
        <View style={stiller.ayirac} />
        <Sayac deger={ziyaret} etiket="Doğrulanmış Ziyaret" />
        <View style={stiller.ayirac} />
        <Sayac deger={kupon} etiket="Aktif Kupon" />
      </View>
    </Animated.View>
  );
}

function Sayac({
  deger,
  etiket,
  renk = renkler.metin.ana,
}: {
  deger: number;
  etiket: string;
  renk?: string;
}) {
  return (
    <View style={stiller.sayac}>
      <Text style={[yazi.sayi, { color: renk }]}>{deger}</Text>
      <Text style={stiller.etiket} numberOfLines={2}>
        {etiket}
      </Text>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: {
    flexDirection: "row",
    backgroundColor: renkler.katman,
    borderRadius: yaricap.xl,
    paddingVertical: bosluk.l,
  },
  sayac: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: bosluk.xs },
  etiket: {
    ...yazi.kucuk,
    fontSize: 11,
    textAlign: "center",
    color: renkler.metin.soluk,
  },
  ayirac: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: renkler.cizgi,
    marginVertical: bosluk.xs,
  },
});
