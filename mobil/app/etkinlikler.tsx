import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk, yaricap } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { useVeri } from "../src/api/useVeri";
import type { EtkinlikListesi, KullaniciEtkinligi } from "../src/api/tipler";
import { useOturum } from "../src/store/oturum";
import { EkranBasligi } from "../src/bilesenler/Form";
import { BosDurum } from "../src/bilesenler/BosDurum";
import { Iskelet } from "../src/bilesenler/Iskelet";
import { EtkinlikKarti } from "../src/ozellikler/etkinlik/EtkinlikKarti";
import { onayIste } from "../src/bilesenler/onay";

/**
 * Kullanıcı etkinlikleri — "kimler nerede buluşuyor".
 *
 * Girişsiz de okunabiliyor: buluşmalar uygulamanın en çekici içeriği ve
 * onu giriş duvarının arkasına koymak, kaydolma sebebini gizlemek olurdu.
 * İlgi göstermek ve etkinlik açmak giriş istiyor.
 */
export default function EtkinliklerEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const girisli = useOturum((s) => s.durum === "girisli");

  const { veri, yenileniyor, cevrimdisi, yenile, getir } =
    useVeri<EtkinlikListesi>("/api/app/etkinlikler", { jetonlu: true, onbellek: true });

  /**
   * İlgi işareti ÖNCE EKRANDA değişiyor, istek arkadan gidiyor.
   *
   * Liste `useVeri`nin içinde durduğu için yerel bir üst katman
   * tutuluyor: aynı listeyi yeniden çekmek, kullanıcının parmağını
   * kaldırdığı yerde yarım saniyelik bir donma yaratıyordu.
   */
  const [yerelIlgi, setYerelIlgi] = useState<
    Record<string, { ilgilendimMi: boolean; ilgiSayisi: number }>
  >({});

  const etkinlikler: KullaniciEtkinligi[] = (veri?.etkinlikler ?? []).map((e) => {
    const yerel = yerelIlgi[e.id];
    return yerel ? { ...e, ...yerel } : e;
  });

  const ilgiDegistir = useCallback(
    async (etkinlik: KullaniciEtkinligi) => {
      if (!girisli) {
        router.push("/giris");
        return;
      }
      const yeniDurum = !etkinlik.ilgilendimMi;
      setYerelIlgi((onceki) => ({
        ...onceki,
        [etkinlik.id]: {
          ilgilendimMi: yeniDurum,
          ilgiSayisi: etkinlik.ilgiSayisi + (yeniDurum ? 1 : -1),
        },
      }));

      const sonuc = await api.put<{ ilgilendimMi: boolean; ilgiSayisi: number }>(
        "/api/app/etkinlikler",
        { etkinlikId: etkinlik.id },
      );
      if (!sonuc.ok) {
        // Geri al: iyimserlik yalanla bitmemeli.
        setYerelIlgi((onceki) => ({
          ...onceki,
          [etkinlik.id]: {
            ilgilendimMi: etkinlik.ilgilendimMi,
            ilgiSayisi: etkinlik.ilgiSayisi,
          },
        }));
        return;
      }
      setYerelIlgi((onceki) => ({ ...onceki, [etkinlik.id]: sonuc.veri }));
    },
    [girisli, router],
  );

  const iptalEt = useCallback(
    async (etkinlik: KullaniciEtkinligi) => {
      // İptal geri alınamaz ve ilgi gösterenlerin gördüğü bir çağrıyı
      // kaldırıyor; onay sorulmadan yapılmamalı.
      const onay = await onayIste(
        "Etkinliği iptal et",
        `"${etkinlik.baslik}" iptal edilsin mi? İlgilenenler artık göremeyecek.`,
        "İptal et",
      );
      if (!onay) return;
      const sonuc = await api.delete("/api/app/etkinlikler", { etkinlikId: etkinlik.id });
      if (sonuc.ok) await getir();
      else Alert.alert("İptal edilemedi", sonuc.hata);
    },
    [getir],
  );

  return (
    <View style={[stiller.kap, { paddingTop: guvenliAlan.top + bosluk.s }]}>
      <EkranBasligi baslik="Buluşmalar" onGeri={() => (router.canGoBack() ? router.back() : router.replace("/kesfet"))} />

      {cevrimdisi && veri ? (
        <Text style={stiller.cevrimdisi}>Çevrimdışısın — bu liste en son gördüğün hâli.</Text>
      ) : null}

      {!veri ? (
        <View style={{ gap: bosluk.m, paddingHorizontal: bosluk.xl }}>
          <Iskelet yukseklik={120} kose={yaricap.l} />
          <Iskelet yukseklik={120} kose={yaricap.l} />
        </View>
      ) : etkinlikler.length === 0 ? (
        <BosDurum
          cizim="rota"
          baslik="Henüz buluşma yok"
          aciklama="Bir mekan sayfasını açıp 'Burada buluşma aç' diyerek ilkini sen başlatabilirsin."
          butonMetni="Mekanları keşfet"
          onButon={() => router.replace("/kesfet")}
        />
      ) : (
        <FlatList
          data={etkinlikler}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <EtkinlikKarti
              etkinlik={item}
              onIlgi={() => void ilgiDegistir(item)}
              onIptal={item.benimMi ? () => void iptalEt(item) : undefined}
            />
          )}
          contentContainerStyle={{
            padding: bosluk.xl,
            paddingBottom: guvenliAlan.bottom + bosluk.xxl,
            gap: bosluk.m,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={yenile}
              tintColor={renkler.vurguParlak}
            />
          }
        />
      )}
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  cevrimdisi: {
    ...yazi.kucuk,
    color: renkler.uyari,
    paddingHorizontal: bosluk.xl,
    paddingBottom: bosluk.s,
  },
});
