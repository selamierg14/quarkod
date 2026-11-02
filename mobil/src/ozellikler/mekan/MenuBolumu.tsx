import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Cip } from "../../bilesenler/Cip";
import { Gorsel } from "../../bilesenler/Gorsel";
import type { MekanDetay, MekanUrunu } from "../../api/tipler";
import { renkler, yazi, bosluk, yaricap, fontlar } from "../../tasarim";

/** Kuruşu okunur fiyata çevirir: 14000 → "₺140". */
function fiyat(kurus: number): string {
  const lira = kurus / 100;
  const tam = Number.isInteger(lira) ? String(lira) : lira.toFixed(2);
  return `₺${tam.replace(".", ",")}`;
}

/**
 * Mekanın canlı menüsü.
 *
 * Bütün bölümleri alt alta dökmek yerine bölüm çipleri: "Kahveler,
 * Tatlılar, Ana Yemekler" arasında gezinmek için kırk ürün kaydırmak
 * gerekmiyor. Tek bölüm varsa çip çubuğu hiç çizilmiyor — tek seçenekli
 * bir seçici, seçim olmadığını gizleyen bir gürültü.
 *
 * "Tükendi" ürünü listeden ÇIKARMIYORUZ, soluklaştırıp işaretliyoruz:
 * müşteri menüde gördüğü bir şeyin bugün olmadığını bilmek istiyor;
 * ürünün sessizce kaybolması "menüde yok muydu?" sorusunu doğuruyor.
 */
export function MenuBolumu({ menu }: { menu: MekanDetay["menu"] }) {
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const bolumler = menu.bolumler;

  if (bolumler.length === 0) return null;

  const secili = bolumler.find((b) => b.id === seciliId) ?? bolumler[0];

  return (
    <View style={{ gap: bosluk.m }}>
      <View style={stiller.baslikSatiri}>
        <Text style={yazi.bolumBasligi}>Menü</Text>
        {menu.fiyatGuncelleme ? (
          <Text style={yazi.kucuk}>Fiyatlar {tarihMetni(menu.fiyatGuncelleme)} güncellendi</Text>
        ) : null}
      </View>

      {bolumler.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: bosluk.s, paddingRight: bosluk.xl }}
        >
          {bolumler.map((bolum) => (
            <Cip
              key={bolum.id}
              metin={bolum.ad}
              secili={bolum.id === secili.id}
              onPress={() => setSeciliId(bolum.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Animated.View key={secili.id} entering={FadeIn.duration(220)} style={{ gap: bosluk.s }}>
        {secili.urunler.map((urun) => (
          <UrunSatiri key={urun.id} urun={urun} />
        ))}
      </Animated.View>
    </View>
  );
}

function UrunSatiri({ urun }: { urun: MekanUrunu }) {
  return (
    <View style={[stiller.urun, urun.tukendi && stiller.urunTukendi]}>
      {urun.gorselUrl ? (
        <Gorsel kaynak={urun.gorselUrl} stil={stiller.urunGorseli} />
      ) : null}

      <View style={{ flex: 1, gap: 3 }}>
        <View style={stiller.urunBaslikSatiri}>
          <Text style={stiller.urunAdi} numberOfLines={1}>
            {urun.ad}
          </Text>
          {urun.tukendi ? <Text style={stiller.tukendi}>TÜKENDİ</Text> : null}
        </View>
        {urun.aciklama ? (
          <Text style={yazi.kucuk} numberOfLines={2}>
            {urun.aciklama}
          </Text>
        ) : null}
        {urun.kaloriKcal !== null || urun.alerjenler.length > 0 ? (
          <Text style={stiller.detay}>
            {urun.kaloriKcal !== null ? `${urun.kaloriKcal} kcal` : ""}
            {urun.kaloriKcal !== null && urun.alerjenler.length > 0 ? "  ·  " : ""}
            {urun.alerjenler.length > 0 ? `⚠︎ ${urun.alerjenler.join(", ")}` : ""}
          </Text>
        ) : null}
      </View>

      <Text style={stiller.fiyat}>{fiyat(urun.fiyatKurus)}</Text>
    </View>
  );
}

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

const stiller = StyleSheet.create({
  baslikSatiri: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: bosluk.s,
  },
  urun: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    padding: bosluk.m,
    borderRadius: yaricap.m,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  urunTukendi: { opacity: 0.45 },
  urunGorseli: { width: 52, height: 52, borderRadius: yaricap.s },
  urunBaslikSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.s },
  urunAdi: {
    fontFamily: fontlar.orta,
    fontSize: 14,
    color: renkler.metin.ana,
    flexShrink: 1,
  },
  tukendi: {
    fontFamily: fontlar.yariKalin,
    fontSize: 9,
    letterSpacing: 0.6,
    color: renkler.uyari,
  },
  detay: { ...yazi.kucuk, fontSize: 11 },
  fiyat: {
    fontFamily: fontlar.yariKalin,
    fontSize: 14,
    color: renkler.metin.ana,
    fontVariant: ["tabular-nums"],
  },
});
