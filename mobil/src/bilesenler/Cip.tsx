import { Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Basilabilir } from "./Basilabilir";
import { renkler, bosluk, yaricap, fontlar } from "../tasarim";

/**
 * Küçük etiket/filtre düğmesi.
 *
 * İki işi var: seçilebilir filtre (Keşfet'in kategori çubuğu) ve salt
 * okunur rozet (kartın üstündeki "🌿 Bahçe"). Aynı bileşen olmaları
 * bilinçli — ikisi de aynı yükseklik ve yarıçapta olmalı, ayrı yazılınca
 * ilk gözden kaçan şey bu oluyor.
 *
 * Seçili hâl RENGİ değil ZEMİNİ değiştiriyor: koyu temada yalnızca metin
 * rengini değiştirmek, küçük bir çipte seçili olanı ayırt etmeye
 * yetmiyordu.
 */
export function Cip({
  metin,
  simge,
  secili = false,
  onPress,
  stil,
}: {
  metin: string;
  simge?: string;
  secili?: boolean;
  /** Verilmezse çip basılamaz bir rozet olur. */
  onPress?: () => void;
  stil?: StyleProp<ViewStyle>;
}) {
  const govde = (
    <>
      {simge ? <Text style={stiller.simge}>{simge}</Text> : null}
      <Text
        style={[stiller.metin, secili && stiller.metinSecili]}
        numberOfLines={1}
      >
        {metin}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <Basilabilir
        disabled
        titresim="yok"
        style={[stiller.kap, stiller.rozet, stil]}
      >
        {govde}
      </Basilabilir>
    );
  }

  return (
    <Basilabilir
      onPress={onPress}
      olcek={0.93}
      accessibilityRole="button"
      accessibilityState={{ selected: secili }}
      style={[stiller.kap, secili ? stiller.secili : stiller.bos, stil]}
    >
      {govde}
    </Basilabilir>
  );
}

const stiller = StyleSheet.create({
  kap: {
    minHeight: 0,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: bosluk.m,
    borderRadius: yaricap.tam,
  },
  bos: {
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  secili: {
    backgroundColor: renkler.vurgu,
  },
  /** Salt okunur rozet: kart üstünde durduğu için daha alçak ve sessiz. */
  rozet: {
    height: 26,
    paddingHorizontal: bosluk.s,
    backgroundColor: renkler.katmanYuksek,
    opacity: 1,
  },
  simge: { fontSize: 12 },
  metin: {
    fontFamily: fontlar.orta,
    fontSize: 13,
    color: renkler.metin.govde,
  },
  metinSecili: {
    fontFamily: fontlar.yariKalin,
    color: "#FFFFFF",
  },
});
