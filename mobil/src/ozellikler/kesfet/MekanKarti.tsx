import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { Gorsel } from "../../bilesenler/Gorsel";
import { AcikRozeti } from "../../bilesenler/AcikRozeti";
import type { MekanOzet } from "../../api/tipler";
import {
  renkler,
  yazi,
  bosluk,
  yaricap,
  golge,
  turRenkleri,
  turSimgeleri,
} from "../../tasarim";
import { fiyatIsareti, mesafeMetni, puanMetni, turAdi, turKisaAdi } from "../mekan/etiketler";

/**
 * Yatay şeritteki mekan kartı.
 *
 * Kart eskiden yalnızca ad, puan ve fiyat taşıyordu; mesafe ve tür
 * kullanıcının "buraya gider miyim" kararını veren iki bilgiydi ve ikisi
 * de yoktu. Şerit kartında yer dar olduğu için özellik rozetleri burada
 * değil, dikey listedeki satırda gösteriliyor (bkz. MekanSatiri).
 */
export function MekanKarti({
  mekan,
  genislik,
  buyuk = false,
  sira = 0,
  onPress,
}: {
  mekan: MekanOzet;
  genislik: number;
  buyuk?: boolean;
  sira?: number;
  onPress?: () => void;
}) {
  const turRengi = turRenkleri[mekan.tur] ?? renkler.vurgu;
  const mesafe = mesafeMetni(mekan.mesafeMetre);
  const puan = puanMetni(mekan.puan);
  const fiyat = fiyatIsareti(mekan.fiyatSegmenti);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(sira, 6) * 55).duration(360).springify()}>
      <Basilabilir
        onPress={onPress}
        style={[{ width: genislik }, stiller.kart, golge("m")]}
        olcek={0.97}
        accessibilityRole="button"
        accessibilityLabel={`${mekan.ad}, ${turAdi(mekan.tur)}${puan ? `, ${puan} puan` : ""}`}
      >
        <View style={{ height: buyuk ? 168 : 124, backgroundColor: renkler.katmanYuksek }}>
          <Gorsel
            kaynak={mekan.kapakUrl}
            markaRengi={mekan.markaRengi}
            stil={StyleSheet.absoluteFill}
          />
          {/* Perde HEM ÜSTTE HEM ALTTA: yalnızca alta perde koyunca tür rozeti
              açık renkli fotoğraflarda (kremalı balık, latte köpüğü) tamamen
              kayboluyordu — koyu fotoğraflarda sorun görünmediği için gözden
              kaçması kolay bir kusur. */}
          <LinearGradient
            colors={[
              "rgba(18,18,20,0.66)",
              "transparent",
              "rgba(18,18,20,0.45)",
              "rgba(18,18,20,0.95)",
            ]}
            locations={[0, 0.3, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={stiller.ustSatir}>
            <View style={[stiller.turRozeti, { borderColor: `${turRengi}66` }]}>
              <Text style={stiller.turSimgesi}>{turSimgeleri[mekan.tur] ?? "📍"}</Text>
              <Text style={[stiller.turMetni, { color: turRengi }]} numberOfLines={1}>
                {turKisaAdi(mekan.tur)}
              </Text>
            </View>
            {mekan.etkinlikler.length > 0 ? (
              <View style={stiller.etkinlikRozeti}>
                <Text style={stiller.turSimgesi}>🔥</Text>
              </View>
            ) : null}
          </View>

          <View style={stiller.altSatir}>
            <Text style={yazi.kartBasligi} numberOfLines={1}>
              {mekan.ad}
            </Text>
            <View style={stiller.bilgiSatiri}>
              {puan ? <Text style={stiller.puan}>⭐ {puan}</Text> : null}
              {fiyat ? <Text style={stiller.bilgi}>{fiyat}</Text> : null}
              {mesafe ? <Text style={stiller.mesafe}>{mesafe}</Text> : null}
            </View>
            {/* Kartta YALNIZCA "açık" gösteriliyor, kapalı gösterilmiyor:
                şeritler ("Yakınında", "Bu hafta etkinlik var") bir öneri
                vitrini ve her kartın altına gri "kapalı" yazmak vitrini
                ölü bir listeye çeviriyor. Kapalı bilgisi dikey listede ve
                mekan sayfasında zaten var. */}
            {mekan.acik === "acik" ? (
              <View style={stiller.acikSatiri}>
                <AcikRozeti durum="acik" boyut="kucuk" />
              </View>
            ) : null}
          </View>
        </View>
      </Basilabilir>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  acikSatiri: { flexDirection: "row", marginTop: 2 },
  kart: {
    borderRadius: yaricap.l,
    overflow: "hidden",
    backgroundColor: renkler.katman,
    minHeight: 0,
  },
  ustSatir: {
    position: "absolute",
    top: bosluk.s,
    left: bosluk.s,
    right: bosluk.s,
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.xs,
  },
  turRozeti: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "70%",
    paddingHorizontal: bosluk.s,
    paddingVertical: 4,
    borderRadius: yaricap.tam,
    // Zemin KOYU, tür rengi yalnızca kenarlıkta ve metinde. Önce zemin
    // türün rengiydi (`${turRengi}2E`) ve satır içi stil buradaki koyu
    // camı eziyordu: açık renkli bir fotoğrafın üstünde rozet neredeyse
    // görünmez oluyordu.
    backgroundColor: renkler.camKoyu,
    borderWidth: StyleSheet.hairlineWidth,
  },
  turSimgesi: { fontSize: 11 },
  turMetni: { fontSize: 11, fontWeight: "700" },
  etkinlikRozeti: {
    marginLeft: "auto",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.tam,
    backgroundColor: "rgba(16,185,129,0.28)",
  },
  altSatir: {
    position: "absolute",
    left: bosluk.m,
    right: bosluk.m,
    bottom: bosluk.m,
    gap: 3,
  },
  bilgiSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.s },
  puan: { fontSize: 12, color: renkler.odulParlak, fontWeight: "600" },
  bilgi: { fontSize: 12, color: renkler.metin.govde },
  mesafe: { fontSize: 12, color: renkler.metin.soluk },
});
