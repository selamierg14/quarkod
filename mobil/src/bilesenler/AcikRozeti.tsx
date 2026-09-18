import { View, Text, StyleSheet } from "react-native";
import { renkler, yazi, bosluk, yaricap } from "../tasarim";
import type { MekanOzet } from "../api/tipler";

/**
 * "Şu an açık / kapalı" rozeti.
 *
 * Uygulamanın cevaplayamadığı en temel soru buydu: kullanıcı bir mekanı
 * beğenip yola çıkıyor ve kapalı kapıyla karşılaşıyordu. Sunucu açıklık
 * bilgisini uzun süredir gönderiyordu, mobil taraf hiç okumuyordu.
 *
 * ÜÇ DURUM VAR, İKİ TANE DEĞİL. "bilinmiyor" (saatini girmemiş mekan)
 * için hiçbir şey çizilmiyor — "kapalı" yazmak o mekandan müşteri
 * kaçırmak, "açık" yazmak kullanıcıyı boşuna yola çıkarmak olurdu.
 * Sessiz kalmak ikisinden de dürüst.
 *
 * Renk tek başına taşıyıcı değil: yeşil/gri noktanın yanında her zaman
 * yazı var. Kırmızı-yeşil ayırt edemeyen kullanıcı için nokta tek başına
 * hiçbir şey söylemiyor.
 */
export function AcikRozeti({
  durum,
  sonrakiAcilis,
  boyut = "normal",
}: {
  durum: MekanOzet["acik"];
  sonrakiAcilis?: string | null;
  /** "kucuk" liste satırları için; yazı ve nokta küçülüyor. */
  boyut?: "normal" | "kucuk";
}) {
  if (durum === "bilinmiyor") return null;

  const acik = durum === "acik";
  const kucuk = boyut === "kucuk";
  const renk = acik ? renkler.basari : renkler.metin.soluk;

  return (
    <View style={[stiller.kap, kucuk && stiller.kapKucuk]}>
      <View
        style={[
          stiller.nokta,
          kucuk && { width: 5, height: 5, borderRadius: 2.5 },
          { backgroundColor: renk },
        ]}
      />
      <Text
        style={[stiller.metin, kucuk && { fontSize: 11 }, { color: renk }]}
        numberOfLines={1}
      >
        {acik ? "Şu an açık" : sonrakiAcilis ? `Kapalı · ${sonrakiAcilis}` : "Şu an kapalı"}
      </Text>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: bosluk.s,
    paddingVertical: 3,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
    // Uzun "Kapalı · Pazartesi 09:00" metni satırı taşırmasın.
    flexShrink: 1,
  },
  kapKucuk: { paddingHorizontal: 6, paddingVertical: 2, gap: 4 },
  nokta: { width: 6, height: 6, borderRadius: 3 },
  metin: { ...yazi.kucuk, fontSize: 12, flexShrink: 1 },
});
