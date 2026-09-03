import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Image, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  renkler,
  yazi,
  bosluk,
  yaricap,
  golge,
  turRenkleri,
  turSimgeleri,
  SEKME_YUKSEKLIGI,
} from "../../src/tasarim";
import { api, API_TABAN } from "../../src/api/istemci";
import type { MekanListesi, MekanOzet } from "../../src/api/tipler";
import { useOturum } from "../../src/store/oturum";
import { Iskelet } from "../../src/bilesenler/Iskelet";
import { Basilabilir } from "../../src/bilesenler/Basilabilir";

export default function KesfetEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const kullanici = useOturum((s) => s.kullanici);
  const [veri, setVeri] = useState<MekanListesi | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const getir = useCallback(async () => {
    const sonuc = await api.acikGet<MekanListesi>("/api/app/mekanlar");
    if (sonuc.ok) setVeri(sonuc.veri);
  }, []);

  useEffect(() => {
    void getir();
  }, [getir]);

  const mekanlar = veri?.mekanlar ?? [];
  const sponsorlu = mekanlar.filter((m) => m.sponsorluMu);
  const etkinlikliler = mekanlar.filter((m) => m.etkinlikler.length > 0);

  return (
    <ScrollView
      style={stiller.kap}
      contentContainerStyle={{
        paddingTop: guvenliAlan.top + bosluk.l,
        paddingBottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + bosluk.xxl,
        gap: bosluk.xxl,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={async () => {
            setYenileniyor(true);
            await getir();
            setYenileniyor(false);
          }}
          tintColor={renkler.vurguParlak}
        />
      }
    >
      {/* Selamlama — saate göre değişiyor, uygulamayı "bugüne" bağlıyor. */}
      <View style={stiller.baslik}>
        <Text style={yazi.kucuk}>{selamlama()}</Text>
        <Text style={yazi.ekranBasligi}>
          {kullanici ? `${kullanici.name.split(" ")[0]}, bugün nereye?` : "Bugün nereye?"}
        </Text>
      </View>

      {!veri ? (
        <View style={{ gap: bosluk.xl }}>
          <YatayIskelet />
          <YatayIskelet />
        </View>
      ) : (
        <>
          {sponsorlu.length > 0 ? (
            <Serit baslik="Bu hafta öne çıkanlar" mekanlar={sponsorlu} buyuk />
          ) : null}
          {etkinlikliler.length > 0 ? (
            <Serit baslik="Bu hafta etkinlik var 🔥" mekanlar={etkinlikliler} />
          ) : null}
          <Serit baslik={`Tüm mekanlar · ${veri.adet}`} mekanlar={mekanlar} />
        </>
      )}
    </ScrollView>
  );
}

function selamlama(): string {
  const saat = new Date().getHours();
  if (saat < 6) return "İyi geceler";
  if (saat < 12) return "Günaydın";
  if (saat < 18) return "İyi günler";
  return "İyi akşamlar";
}

/**
 * Yatay kaydırılabilir mekan şeridi.
 *
 * Dikey bir liste ekranı tek bir kategoriye hapsediyordu; yatay şeritler
 * "aynı ekranda birden çok fikir" gösterebiliyor (öne çıkanlar, etkinlik
 * olanlar, hepsi). `snapToInterval` ile kart kart duruyor — serbest
 * kaydırma yarım kalmış kartlarla bırakıyordu.
 */
function Serit({
  baslik,
  mekanlar,
  buyuk = false,
}: {
  baslik: string;
  mekanlar: MekanOzet[];
  buyuk?: boolean;
}) {
  const genislik = buyuk ? 300 : 190;
  return (
    <View style={{ gap: bosluk.m }}>
      <Text style={[yazi.bolumBasligi, { paddingHorizontal: bosluk.xl }]}>{baslik}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: bosluk.xl, gap: bosluk.m }}
        snapToInterval={genislik + bosluk.m}
        decelerationRate="fast"
      >
        {mekanlar.map((mekan, sira) => (
          <MekanKarti key={mekan.id} mekan={mekan} genislik={genislik} buyuk={buyuk} sira={sira} />
        ))}
      </ScrollView>
    </View>
  );
}

function MekanKarti({
  mekan,
  genislik,
  buyuk,
  sira,
}: {
  mekan: MekanOzet;
  genislik: number;
  buyuk: boolean;
  sira: number;
}) {
  const kapak = mekan.kapakUrl ? `${API_TABAN}${mekan.kapakUrl}` : null;
  const turRengi = turRenkleri[mekan.tur] ?? renkler.vurgu;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(sira, 6) * 60).duration(380).springify()}>
      <Basilabilir style={[{ width: genislik }, stiller.kart, golge("m")]} olcek={0.97}>
        <View style={{ height: buyuk ? 168 : 116, backgroundColor: renkler.katmanYuksek }}>
          {kapak ? (
            <Image source={{ uri: kapak }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[mekan.markaRengi, renkler.zemin]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Fotoğrafın ışığı kaçmasın: yalnızca tabanda ince bir perde. */}
          <LinearGradient
            colors={["transparent", "rgba(18,18,20,0.92)"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={stiller.rozetSatiri}>
            <View style={[stiller.turRozeti, { backgroundColor: `${turRengi}26` }]}>
              <Text style={{ fontSize: 11 }}>{turSimgeleri[mekan.tur] ?? "📍"}</Text>
            </View>
            {mekan.etkinlikler.length > 0 ? (
              <View style={[stiller.turRozeti, { backgroundColor: "rgba(16,185,129,0.22)" }]}>
                <Text style={stiller.etkinlikMetni}>🔥</Text>
              </View>
            ) : null}
          </View>

          <View style={stiller.kartAlt}>
            <Text style={yazi.kartBasligi} numberOfLines={1}>
              {mekan.ad}
            </Text>
            <Text style={yazi.kucuk} numberOfLines={1}>
              {mekan.puan !== null ? `⭐ ${mekan.puan.toFixed(1)}` : "Henüz puan yok"}
              {mekan.fiyatSegmenti ? `  ·  ${fiyatIsareti(mekan.fiyatSegmenti)}` : ""}
            </Text>
          </View>
        </View>
      </Basilabilir>
    </Animated.View>
  );
}

function fiyatIsareti(segment: string): string {
  return segment === "ucuz" ? "₺" : segment === "orta" ? "₺₺" : "₺₺₺";
}

function YatayIskelet() {
  return (
    <View style={{ gap: bosluk.m }}>
      <Iskelet genislik={160} yukseklik={20} stil={{ marginHorizontal: bosluk.xl }} />
      <View style={{ flexDirection: "row", gap: bosluk.m, paddingHorizontal: bosluk.xl }}>
        <Iskelet genislik={190} yukseklik={116} kose={yaricap.l} />
        <Iskelet genislik={190} yukseklik={116} kose={yaricap.l} />
      </View>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  baslik: { paddingHorizontal: bosluk.xl, gap: 2 },
  kart: {
    borderRadius: yaricap.l,
    overflow: "hidden",
    backgroundColor: renkler.katman,
    minHeight: 0,
  },
  rozetSatiri: {
    position: "absolute",
    top: bosluk.s,
    left: bosluk.s,
    flexDirection: "row",
    gap: bosluk.xs,
  },
  turRozeti: {
    width: 26,
    height: 26,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
  },
  etkinlikMetni: { fontSize: 11 },
  kartAlt: {
    position: "absolute",
    left: bosluk.m,
    right: bosluk.m,
    bottom: bosluk.m,
    gap: 2,
  },
});
