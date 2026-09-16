import { View, Text, StyleSheet } from "react-native";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { Cip } from "../../bilesenler/Cip";
import { Gorsel } from "../../bilesenler/Gorsel";
import { AcikRozeti } from "../../bilesenler/AcikRozeti";
import type { MekanOzet } from "../../api/tipler";
import { renkler, yazi, bosluk, yaricap, turRenkleri, turSimgeleri } from "../../tasarim";
import {
  fiyatIsareti,
  mesafeMetni,
  ozellikAdlari,
  ozellikSimgeleri,
  puanMetni,
  turAdi,
} from "../mekan/etiketler";

/** Satırda gösterilen özellik sayısı — fazlası satırı iki katına çıkarıyor. */
const EN_COK_OZELLIK = 2;

/**
 * Dikey listedeki mekan satırı.
 *
 * Keşfet eskiden yalnızca yatay şeritlerden oluşuyordu: ekranın alt yarısı
 * boş kalıyor ve kullanıcının kaydıracağı bir şey olmuyordu. Uzun dikey
 * liste hem o boşluğu dolduruyor hem de yatay şeridin gösteremediği
 * bilgiyi (özellik rozetleri, adres) taşıyabiliyor.
 *
 * Yükseklik SABİT (96): FlatList'in `getItemLayout` ile satırları
 * ölçmeden yerleştirebilmesi, 52 satırlık listede kaydırmayı belirgin
 * biçimde akıcılaştırıyor.
 */
export const SATIR_YUKSEKLIGI = 96;

export function MekanSatiri({
  mekan,
  onPress,
}: {
  mekan: MekanOzet;
  onPress?: () => void;
}) {
  const turRengi = turRenkleri[mekan.tur] ?? renkler.vurgu;
  const puan = puanMetni(mekan.puan);
  const fiyat = fiyatIsareti(mekan.fiyatSegmenti);
  const mesafe = mesafeMetni(mekan.mesafeMetre);
  const ozellikler = mekan.ozellikler.filter((o) => o in ozellikAdlari).slice(0, EN_COK_OZELLIK);

  return (
    <Basilabilir
      onPress={onPress}
      olcek={0.985}
      style={stiller.kap}
      accessibilityRole="button"
      accessibilityLabel={`${mekan.ad}, ${turAdi(mekan.tur)}`}
    >
      <View style={stiller.gorsel}>
        <Gorsel
          kaynak={mekan.kapakUrl}
          markaRengi={mekan.markaRengi}
          stil={StyleSheet.absoluteFill}
        />
        {mekan.etkinlikler.length > 0 ? (
          <View style={stiller.etkinlik}>
            <Text style={{ fontSize: 10 }}>🔥</Text>
          </View>
        ) : null}
      </View>

      <View style={stiller.govde}>
        <Text style={yazi.kartBasligi} numberOfLines={1}>
          {mekan.ad}
        </Text>

        <View style={stiller.bilgiSatiri}>
          <Text style={{ fontSize: 11 }}>{turSimgeleri[mekan.tur] ?? "📍"}</Text>
          <Text style={[stiller.tur, { color: turRengi }]} numberOfLines={1}>
            {turAdi(mekan.tur)}
          </Text>
          {puan ? <Text style={stiller.puan}>⭐ {puan}</Text> : null}
          {fiyat ? <Text style={stiller.soluk}>{fiyat}</Text> : null}
          {mesafe ? <Text style={stiller.soluk}>· {mesafe}</Text> : null}
        </View>

        {/* Açıklık ve özellikler AYNI satırda: ikisini alt alta koymak
            satır yüksekliğini sabit tutan ölçüyü (SATIR_YUKSEKLIGI)
            bozuyordu. Açıklık önce geliyor — "gidebilir miyim" sorusu
            "prizi var mı"dan önce cevaplanmalı. */}
        {mekan.acik !== "bilinmiyor" || ozellikler.length > 0 ? (
          <View style={stiller.ozellikSatiri}>
            <AcikRozeti durum={mekan.acik} sonrakiAcilis={mekan.sonrakiAcilis} boyut="kucuk" />
            {ozellikler.map((o) => (
              <Cip key={o} metin={ozellikAdlari[o]} simge={ozellikSimgeleri[o]} />
            ))}
          </View>
        ) : null}
      </View>
    </Basilabilir>
  );
}

const stiller = StyleSheet.create({
  kap: {
    height: SATIR_YUKSEKLIGI,
    marginHorizontal: bosluk.xl,
    marginBottom: bosluk.m,
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    padding: bosluk.s,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  gorsel: {
    width: 78,
    height: 78,
    borderRadius: yaricap.m,
    overflow: "hidden",
    backgroundColor: renkler.katmanYuksek,
  },
  etkinlik: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.tam,
    backgroundColor: "rgba(16,185,129,0.32)",
  },
  govde: { flex: 1, gap: 5, paddingRight: bosluk.xs },
  bilgiSatiri: { flexDirection: "row", alignItems: "center", gap: 5 },
  tur: { fontSize: 11, fontWeight: "600" },
  puan: { fontSize: 12, color: renkler.odulParlak, fontWeight: "600" },
  soluk: { fontSize: 12, color: renkler.metin.soluk },
  ozellikSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.xs },
});
