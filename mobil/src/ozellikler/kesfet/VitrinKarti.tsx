import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { Gorsel } from "../../bilesenler/Gorsel";
import type { MekanOzet } from "../../api/tipler";
import { renkler, yazi, bosluk, yaricap, golge, fontlar } from "../../tasarim";
import { mesafeMetni, puanMetni, turAdi } from "../mekan/etiketler";

/**
 * Ekranın en üstündeki tam genişlikte vitrin kartı.
 *
 * Keşfet'te her şey aynı boyda kartlardan oluşuyordu; göz nereye
 * bakacağını bilmiyor ve ekran "liste" gibi duruyordu. Tek bir büyük
 * görsel, sayfaya bir giriş noktası ve editoryal bir ses veriyor —
 * "bugün şuraya bak" diyen bir vitrin.
 *
 * İçerik seçimi öncelik sırasıyla: sponsorlu mekan, sonra bu hafta
 * etkinliği olan, sonra en yakın/ilk mekan. Sponsorluk zaten ücretli bir
 * yerleşim; en görünür alanı ona ayırmak ürünün gelir modeliyle tutarlı.
 */
export function VitrinKarti({
  mekan,
  onPress,
}: {
  mekan: MekanOzet;
  onPress?: () => void;
}) {
  const etkinlik = mekan.etkinlikler[0] ?? null;
  const puan = puanMetni(mekan.puan);
  const mesafe = mesafeMetni(mekan.mesafeMetre);

  const ustEtiket = mekan.sponsorluMu
    ? "ÖNE ÇIKAN"
    : etkinlik
      ? "BU HAFTA"
      : "BUGÜN NEREYE?";

  return (
    <Animated.View entering={FadeIn.duration(420)} style={{ paddingHorizontal: bosluk.xl }}>
      <Basilabilir
        onPress={onPress}
        olcek={0.985}
        style={[stiller.kart, golge("l")]}
        accessibilityRole="button"
        accessibilityLabel={`${ustEtiket}: ${mekan.ad}`}
      >
        <Gorsel
          kaynak={mekan.kapakUrl}
          markaRengi={mekan.markaRengi}
          oncelik="high"
          stil={StyleSheet.absoluteFill}
        />
        {/* Başlık 22 punto ve beyaz; altındaki perdenin erken başlaması
            şart, aksi halde açık renkli bir fotoğrafta yazı fotoğrafın
            içinde kayboluyor. */}
        <LinearGradient
          colors={[
            "rgba(18,18,20,0.6)",
            "transparent",
            "rgba(18,18,20,0.55)",
            "rgba(18,18,20,0.97)",
          ]}
          locations={[0, 0.32, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={stiller.etiket}>
          <Text style={stiller.etiketMetni}>{ustEtiket}</Text>
        </View>

        <View style={stiller.govde}>
          <Text style={stiller.baslik} numberOfLines={2}>
            {etkinlik ? etkinlik.baslik : mekan.ad}
          </Text>
          <Text style={stiller.altBaslik} numberOfLines={1}>
            {etkinlik ? mekan.ad : turAdi(mekan.tur)}
            {puan ? `  ·  ⭐ ${puan}` : ""}
            {mesafe ? `  ·  ${mesafe}` : ""}
          </Text>
        </View>
      </Basilabilir>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kart: {
    height: 228,
    borderRadius: yaricap.xl,
    overflow: "hidden",
    backgroundColor: renkler.katman,
    justifyContent: "flex-end",
  },
  etiket: {
    position: "absolute",
    top: bosluk.m,
    left: bosluk.m,
    paddingHorizontal: bosluk.s,
    paddingVertical: 5,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.camKoyu,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
  },
  etiketMetni: {
    ...yazi.etiket,
    color: renkler.metin.ana,
    fontSize: 10,
  },
  govde: { padding: bosluk.l, gap: 4 },
  baslik: {
    fontFamily: fontlar.kalin,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: renkler.metin.ana,
  },
  altBaslik: {
    fontFamily: fontlar.orta,
    fontSize: 13,
    color: renkler.metin.govde,
  },
});
