import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk, yaricap } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { EkranBasligi, HataMetni } from "../src/bilesenler/Form";

type Tercih = { anahtar: string; ad: string; aciklama: string; acik: boolean };

/**
 * Bildirim tercihleri — hangi kategoriden haber almak istiyor.
 *
 * Tek bir aç/kapa anahtarı vardı; ilgisiz iki bildirim alan kullanıcı onu
 * kapatınca rozetinden favori mekanının duyurusuna kadar her şey
 * kesiliyordu. Kategori başına anahtar, kanalı hem canlı hem saygılı
 * tutuyor.
 *
 * LİSTE SUNUCUDAN GELİYOR (ad ve açıklama dahil): yeni bir kategori
 * eklendiğinde yayındaki eski sürüm de onu gösterip kapatabilsin.
 * Sabit kodlansaydı, kullanıcı mağaza güncellemesini bekleyene kadar
 * kapatamadığı bir bildirim almaya devam ederdi.
 *
 * Dokunuş ANINDA gönderiliyor, "Kaydet" düğmesi yok: tek bir anahtarın
 * ardından form göndermek, ayar ekranlarında insanların yapmayı unuttuğu
 * şey.
 */
export default function BildirimTercihleriEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const girisli = useOturum((s) => s.durum === "girisli");

  const [tercihler, setTercihler] = useState<Tercih[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [islenen, setIslenen] = useState<string | null>(null);

  useEffect(() => {
    if (!girisli) return;
    let iptal = false;
    api.get<{ tercihler: Tercih[] }>("/api/app/bildirim-tercihleri").then((sonuc) => {
      if (iptal) return;
      if (sonuc.ok) setTercihler(sonuc.veri.tercihler);
      else setHata(sonuc.hata);
    });
    return () => {
      iptal = true;
    };
  }, [girisli]);

  async function degistir(tercih: Tercih) {
    setIslenen(tercih.anahtar);
    const sonuc = await api.put<{ tercihler: Tercih[] }>("/api/app/bildirim-tercihleri", {
      tercihler: { [tercih.anahtar]: !tercih.acik },
    });
    setIslenen(null);
    // Sunucunun döndürdüğü liste esas alınıyor: ekranın kendi tahminiyle
    // sunucunun durumu ayrışırsa kullanıcı kapattığını sanıp bildirim
    // almaya devam eder.
    if (sonuc.ok) setTercihler(sonuc.veri.tercihler);
    else setHata(sonuc.hata);
  }

  return (
    <View style={stiller.kap}>
      <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
        <EkranBasligi baslik="Bildirim tercihleri" onGeri={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: bosluk.xl,
          paddingBottom: guvenliAlan.bottom + bosluk.xxxl,
          gap: bosluk.m,
        }}
      >
        {!girisli ? (
          <Text style={yazi.govde}>Tercihlerini görmek için giriş yapmalısın.</Text>
        ) : !tercihler ? (
          <ActivityIndicator color={renkler.vurgu} />
        ) : (
          <>
            {tercihler.map((tercih) => (
              <View key={tercih.anahtar} style={stiller.satir}>
                <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                  <Text style={yazi.kartBasligi}>{tercih.ad}</Text>
                  <Text style={yazi.kucuk}>{tercih.aciklama}</Text>
                </View>
                {islenen === tercih.anahtar ? (
                  <ActivityIndicator color={renkler.vurguParlak} />
                ) : (
                  <Basilabilir
                    style={[
                      stiller.dugme,
                      tercih.acik ? stiller.dugmeAcik : stiller.dugmeKapali,
                    ]}
                    onPress={() => void degistir(tercih)}
                    titresim="hafif"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: tercih.acik }}
                    accessibilityLabel={tercih.ad}
                  >
                    <Text
                      style={[
                        yazi.kucuk,
                        tercih.acik ? stiller.metinAcik : stiller.metinKapali,
                      ]}
                    >
                      {tercih.acik ? "Açık" : "Kapalı"}
                    </Text>
                  </Basilabilir>
                )}
              </View>
            ))}

            {/* Kapatılamayanı da söylemek gerekiyor: "neden hâlâ bildirim
                geliyor" sorusunun cevabı burada olmalı. */}
            <Text style={[yazi.kucuk, { marginTop: bosluk.s }]}>
              Rezervasyon ve hesap güvenliği bildirimleri kapatılamaz: ikisi de senin
              başlattığın bir işlemin sonucunu taşıyor.
            </Text>
          </>
        )}

        <HataMetni mesaj={hata} />
      </ScrollView>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  satir: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    backgroundColor: renkler.katman,
    borderRadius: yaricap.l,
    padding: bosluk.l,
  },
  dugme: {
    minHeight: 36,
    paddingHorizontal: bosluk.l,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
  },
  dugmeAcik: { backgroundColor: renkler.vurguSoluk },
  dugmeKapali: { backgroundColor: renkler.katmanYuksek },
  metinAcik: { color: renkler.vurguParlak, fontWeight: "600" },
  metinKapali: { color: renkler.metin.govde, fontWeight: "600" },
});
