import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, SEKME_YUKSEKLIGI } from "../../src/tasarim";
import { TARA_DUGMESI_PAYI } from "../../src/bilesenler/TaraDugmesi";
import { useVeri } from "../../src/api/useVeri";
import type { RotaListesi, RotaOzet } from "../../src/api/tipler";
import { Basilabilir } from "../../src/bilesenler/Basilabilir";
import { Gorsel } from "../../src/bilesenler/Gorsel";
import { Iskelet } from "../../src/bilesenler/Iskelet";
import { BosDurum } from "../../src/bilesenler/BosDurum";

/**
 * Rotalar — "şu beş mekanı gez" temalı keşif listeleri.
 *
 * Web'de sayfası ve uç (`/api/app/rotalar`) vardı, mobilde hiçbir giriş
 * yoktu. Oysa rota, uygulamanın tek "hedef" mekaniği: kullanıcıya
 * ziyaret etmesi için somut bir sıradaki yer veriyor, tamamlayınca puan
 * kazandırıyor.
 *
 * GİRİŞSİZ DE AÇILIYOR. Rota listesi keşif içeriği; uygulamayı yeni açan
 * birine göstermemek için sebep yok. Girişli kullanıcı ek olarak hangi
 * durakları ziyaret ettiğini ve rotayı tamamlayıp tamamlamadığını
 * görüyor — aynı uç ikisini de karşılıyor.
 */
export default function RotalarEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const { veri, yenileniyor, yenile } = useVeri<RotaListesi>("/api/app/rotalar", {
    // Jeton VARSA gönderiliyor: yanıt ona göre zenginleşiyor, yokluğunda
    // da liste geliyor.
    jetonlu: true,
  });

  const rotalar = veri?.rotalar ?? null;

  return (
    <ScrollView
      style={stiller.kap}
      contentContainerStyle={{
        paddingTop: guvenliAlan.top + bosluk.l,
        paddingHorizontal: bosluk.xl,
        paddingBottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + TARA_DUGMESI_PAYI,
        gap: bosluk.xl,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={yenile}
          tintColor={renkler.vurguParlak}
        />
      }
    >
      <View style={{ gap: bosluk.xs }}>
        <Text style={yazi.ekranBasligi}>Rotalar</Text>
        <Text style={yazi.govde}>
          Hazırlanmış duraklardan geç, hepsini tamamlayınca puan kazan.
        </Text>
      </View>

      {!rotalar ? (
        <View style={{ gap: bosluk.m }}>
          <Iskelet yukseklik={150} kose={yaricap.l} />
          <Iskelet yukseklik={150} kose={yaricap.l} />
        </View>
      ) : rotalar.length === 0 ? (
        <BosDurum
          cizim="rota"
          baslik="Henüz rota yok"
          aciklama="Yeni rotalar eklendiğinde burada görünecek."
        />
      ) : (
        rotalar.map((rota, sira) => <RotaKarti key={rota.id} rota={rota} sira={sira} />)
      )}
    </ScrollView>
  );
}

function RotaKarti({ rota, sira }: { rota: RotaOzet; sira: number }) {
  const router = useRouter();
  const ziyaretEdilen = new Set(rota.ziyaretEdilenler);
  const tamamlanan = rota.duraklar.filter((d) => ziyaretEdilen.has(d.businessId)).length;
  const yuzde = rota.duraklar.length > 0 ? tamamlanan / rota.duraklar.length : 0;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(sira, 6) * 60).duration(360).springify()}>
      <View style={stiller.kart}>
        <View style={stiller.kartBaslik}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={yazi.kartBasligi} numberOfLines={1}>
              {rota.ad}
            </Text>
            {rota.aciklama ? (
              <Text style={yazi.kucuk} numberOfLines={2}>
                {rota.aciklama}
              </Text>
            ) : null}
          </View>
          {rota.tamamlandiMi ? (
            <View style={stiller.tamamRozeti}>
              <Text style={stiller.tamamMetni}>✓ Tamamlandı</Text>
            </View>
          ) : null}
        </View>

        {/* İlerleme çubuğu ve sayı birlikte: çubuk tek başına "2 durak mı
            kaldı 20 mi" sorusunu cevaplamıyor. */}
        <View style={{ gap: 6 }}>
          <View style={stiller.cubukZemin}>
            <View style={[stiller.cubukDolu, { width: `${Math.round(yuzde * 100)}%` }]} />
          </View>
          <Text style={stiller.ilerleme}>
            {tamamlanan}/{rota.duraklar.length} durak
          </Text>
        </View>

        <View style={stiller.duraklar}>
          {rota.duraklar.map((durak) => {
            const gidildi = ziyaretEdilen.has(durak.businessId);
            return (
              <Basilabilir
                key={durak.id}
                onPress={() => router.push(`/mekan/${durak.slug}`)}
                style={stiller.durak}
                olcek={0.94}
                accessibilityRole="button"
                accessibilityLabel={`${durak.ad}${gidildi ? ", ziyaret edildi" : ""}`}
              >
                <View style={[stiller.durakGorsel, gidildi && stiller.durakGidildi]}>
                  <Gorsel
                    kaynak={durak.logoUrl}
                    markaRengi={renkler.vurgu}
                    stil={StyleSheet.absoluteFill}
                  />
                  {/* Ziyaret edilen durakta tik: sönükleştirme tek başına
                      "gidildi" mi "kapalı" mı belli etmiyordu. */}
                  {gidildi ? (
                    <View style={stiller.tik}>
                      <Text style={stiller.tikMetni}>✓</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={stiller.durakAdi} numberOfLines={2}>
                  {durak.ad}
                </Text>
              </Basilabilir>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  kart: {
    gap: bosluk.m,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  kartBaslik: { flexDirection: "row", alignItems: "flex-start", gap: bosluk.s },
  tamamRozeti: {
    flexShrink: 0,
    paddingHorizontal: bosluk.s,
    paddingVertical: 3,
    borderRadius: yaricap.tam,
    backgroundColor: "rgba(16,185,129,0.16)",
  },
  tamamMetni: { ...yazi.kucuk, fontSize: 11, color: renkler.basari, fontWeight: "600" },
  cubukZemin: {
    height: 5,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
    overflow: "hidden",
  },
  cubukDolu: { height: "100%", borderRadius: yaricap.tam, backgroundColor: renkler.vurgu },
  ilerleme: { ...yazi.kucuk, fontSize: 11, fontVariant: ["tabular-nums"] },
  duraklar: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.m },
  durak: { width: 64, minHeight: 0, alignItems: "center", gap: 5 },
  durakGorsel: {
    width: 52,
    height: 52,
    borderRadius: yaricap.m,
    overflow: "hidden",
    backgroundColor: renkler.katmanYuksek,
  },
  durakGidildi: { opacity: 0.55 },
  tik: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: renkler.basari,
  },
  tikMetni: { fontSize: 11, color: "#0B1F17", fontWeight: "700" },
  durakAdi: { ...yazi.kucuk, fontSize: 10, textAlign: "center" },
});
