import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { useVeri } from "../src/api/useVeri";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { BosDurum } from "../src/bilesenler/BosDurum";
import { Iskelet } from "../src/bilesenler/Iskelet";
import { EkranBasligi } from "../src/bilesenler/Form";
import { onayIste } from "../src/bilesenler/onay";
import type { RezervasyonKaydi, RezervasyonListesiYaniti } from "../src/api/tipler";

/**
 * "Rezervasyonlarım" — talebin nerede olduğunu gösteren tek yer.
 *
 * Talep mekanın onayına düştüğü için kullanıcının cevabı beklemesi
 * gerekiyor; bu ekran olmadan "onaylandı mı" sorusunun cevabı hiçbir
 * yerde olmazdı. Geçmiş kayıtlar da burada: aynı mekana tekrar gitmek
 * isteyen kişi için en hızlı yol.
 */
export default function RezervasyonlarimEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const girisli = useOturum((s) => s.durum === "girisli");

  const { veri, yenileniyor, yenile } = useVeri<RezervasyonListesiYaniti>(
    "/api/app/rezervasyon",
    { jetonlu: true, etkin: girisli },
  );
  const [iptalEdilen, setIptalEdilen] = useState<string | null>(null);

  async function iptalEt(kayit: RezervasyonKaydi) {
    const onay = await onayIste(
      "Rezervasyonu iptal et",
      `${kayit.mekan.ad} · ${tarihMetni(kayit.baslangic)} rezervasyonun iptal edilecek.`,
      "İptal et",
    );
    if (!onay) return;

    setIptalEdilen(kayit.id);
    const sonuc = await api.delete<{ iptalEdildi: boolean }>("/api/app/rezervasyon", {
      rezervasyonId: kayit.id,
    });
    setIptalEdilen(null);
    // Sunucu son sözü söylüyor (saat geçmiş olabilir); liste tazeleniyor.
    await yenile();
    if (!sonuc.ok) {
      await onayIste("İptal edilemedi", sonuc.hata, "Tamam");
    }
  }

  if (!girisli) {
    return (
      <View style={stiller.kap}>
        <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
          <EkranBasligi baslik="Rezervasyonlarım" onGeri={() => router.back()} />
        </View>
        <BosDurum
          cizim="cuzdan"
          baslik="Giriş yapmalısın"
          aciklama="Rezervasyonların hesabına bağlı."
          butonMetni="Giriş yap"
          onButon={() => router.replace("/giris")}
        />
      </View>
    );
  }

  const kayitlar = veri?.rezervasyonlar ?? [];
  const yaklasan = kayitlar.filter((k) => !k.gecmisMi).reverse();
  const gecmis = kayitlar.filter((k) => k.gecmisMi);

  return (
    <View style={stiller.kap}>
      <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
        <EkranBasligi baslik="Rezervasyonlarım" onGeri={() => router.back()} />
      </View>

      {!veri && yenileniyor ? (
        <View style={{ padding: bosluk.xl, gap: bosluk.m }}>
          <Iskelet yukseklik={96} />
          <Iskelet yukseklik={96} />
        </View>
      ) : kayitlar.length === 0 ? (
        <BosDurum
          cizim="cuzdan"
          baslik="Henüz rezervasyonun yok"
          aciklama="Bir mekan sayfasında “Masa ayırt” diyerek yer ayırtabilirsin."
          butonMetni="Keşfet'e git"
          onButon={() => router.replace("/(sekmeler)/kesfet")}
        />
      ) : (
        <FlatList
          data={[...yaklasan, ...gecmis]}
          keyExtractor={(k) => k.id}
          contentContainerStyle={{
            padding: bosluk.xl,
            paddingBottom: guvenliAlan.bottom + bosluk.xxxl,
            gap: bosluk.m,
          }}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={() => void yenile()}
              tintColor={renkler.vurgu}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
              <Kart
                kayit={item}
                iptalEdiliyor={iptalEdilen === item.id}
                onMekan={() => router.push(`/mekan/${item.mekan.slug}`)}
                onIptal={() => void iptalEt(item)}
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

function Kart({
  kayit,
  iptalEdiliyor,
  onMekan,
  onIptal,
}: {
  kayit: RezervasyonKaydi;
  iptalEdiliyor: boolean;
  onMekan: () => void;
  onIptal: () => void;
}) {
  const soluk = kayit.gecmisMi || kayit.durum === "iptal";

  return (
    <View style={[stiller.kart, soluk && { opacity: 0.6 }]}>
      <Basilabilir onPress={onMekan} olcek={0.98}>
        <Text style={yazi.bolumBasligi}>{kayit.mekan.ad}</Text>
      </Basilabilir>

      <Text style={yazi.govde}>
        {tarihMetni(kayit.baslangic)} · {kayit.kisiSayisi} kişi
      </Text>

      <View style={[stiller.rozet, rozetStili(kayit.durum)]}>
        <Text style={stiller.rozetMetni}>{kayit.durumMetni}</Text>
      </View>

      {kayit.not ? <Text style={yazi.kucuk}>Not: {kayit.not}</Text> : null}

      <View style={stiller.butonSatiri}>
        {kayit.mekan.telefon ? (
          <Basilabilir
            style={stiller.ikincilButon}
            onPress={() => void Linking.openURL(`tel:${kayit.mekan.telefon}`)}
            titresim="hafif"
          >
            <Text style={stiller.ikincilMetin}>Mekanı ara</Text>
          </Basilabilir>
        ) : null}
        {kayit.iptalEdilebilir ? (
          <Basilabilir
            style={[stiller.ikincilButon, iptalEdiliyor && { opacity: 0.5 }]}
            onPress={onIptal}
            disabled={iptalEdiliyor}
            titresim="orta"
          >
            <Text style={[stiller.ikincilMetin, { color: renkler.uyari }]}>
              {iptalEdiliyor ? "İptal ediliyor…" : "İptal et"}
            </Text>
          </Basilabilir>
        ) : null}
      </View>
    </View>
  );
}

/** "18 Eylül Cuma 20:00" — tek satırda gün ve saat. */
export function tarihMetni(isoMetin: string): string {
  const t = new Date(isoMetin);
  return t.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rozetStili(durum: string) {
  if (durum === "onaylandi" || durum === "oturdu") {
    return { backgroundColor: "rgba(52,199,89,0.16)" };
  }
  if (durum === "bekliyor") return { backgroundColor: "rgba(245,165,36,0.16)" };
  return { backgroundColor: renkler.katmanYuksek };
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  kart: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.l,
    padding: bosluk.l,
    gap: bosluk.s,
  },
  rozet: {
    alignSelf: "flex-start",
    borderRadius: yaricap.s,
    paddingHorizontal: bosluk.m,
    paddingVertical: 4,
  },
  rozetMetni: { ...yazi.kucuk, color: renkler.metin.ana },
  butonSatiri: { flexDirection: "row", gap: bosluk.s, marginTop: bosluk.xs },
  ikincilButon: {
    flex: 1,
    borderRadius: yaricap.m,
    borderWidth: 1,
    borderColor: renkler.cizgi,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ikincilMetin: { ...yazi.govde, color: renkler.metin.ana },
});
