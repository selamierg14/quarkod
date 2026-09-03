import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { renkler, yazi, bosluk, yaricap, isima, SEKME_YUKSEKLIGI } from "../../src/tasarim";
import { api } from "../../src/api/istemci";
import type { ProfilYaniti } from "../../src/api/tipler";
import { useOturum } from "../../src/store/oturum";
import { ProfilIskeleti } from "../../src/bilesenler/Iskelet";
import { Basilabilir } from "../../src/bilesenler/Basilabilir";
import { SeviyeHalkasi, IlerlemeCubugu } from "../../src/bilesenler/SeviyeHalkasi";
import { RozetVitrini } from "../../src/ozellikler/profil/RozetVitrini";
import { IstatistikSeridi } from "../../src/ozellikler/profil/IstatistikSeridi";
import { DavetKarti } from "../../src/ozellikler/profil/DavetKarti";

const SEVIYE_ADLARI: Record<number, string> = {
  1: "Meraklı",
  2: "Kaşif",
  3: "Deneyimli Kaşif",
  4: "Usta Kaşif",
  5: "Şehir Efsanesi",
  6: "Biyerlere Lejantı",
};

/** Seviye eşikleri — ilerleme yüzdesi için (bkz. backend lib/rozet.ts). */
const SEVIYE_ESIKLERI = [0, 100, 300, 700, 1500, 3000];

export default function ProfilEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const oturum = useOturum();
  const [veri, setVeri] = useState<ProfilYaniti | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const getir = useCallback(async () => {
    const sonuc = await api.get<ProfilYaniti>("/api/app/profil");
    if (sonuc.ok) setVeri(sonuc.veri);
  }, []);

  useEffect(() => {
    if (oturum.durum === "girisli") void getir();
  }, [oturum.durum, getir]);

  const yenile = useCallback(async () => {
    setYenileniyor(true);
    await Promise.all([getir(), oturum.yenile()]);
    setYenileniyor(false);
  }, [getir, oturum]);

  if (oturum.durum === "cikisli") {
    return (
      <View style={[stiller.merkez, { paddingTop: guvenliAlan.top }]}>
        <Text style={yazi.bolumBasligi}>Profilini görmek için giriş yap</Text>
        <Basilabilir
          style={[stiller.girisButonu, isima(renkler.vurgu)]}
          onPress={() => router.push("/giris")}
          titresim="orta"
        >
          <Text style={yazi.buton}>Giriş yap</Text>
        </Basilabilir>
      </View>
    );
  }

  const yukleniyor = oturum.durum === "yukleniyor" || !veri;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: renkler.zemin }}
      contentContainerStyle={{
        paddingTop: guvenliAlan.top + bosluk.l,
        paddingHorizontal: bosluk.xl,
        paddingBottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + bosluk.xxl,
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
      {yukleniyor ? (
        <ProfilIskeleti />
      ) : (
        <>
          <ProfilBasligi veri={veri} onCikis={() => void oturum.cikisYap()} />

          <IstatistikSeridi
            puan={veri.kullanici.puan}
            ziyaret={veri.kullanici.dogrulanmisZiyaret}
            kupon={veri.kullanici.cuzdandakiKupon}
          />

          <DavetKarti
            davetKodu={veri.kullanici.referralCode}
            davetEdilenSayisi={veri.kullanici.davetEttigiKisiSayisi}
          />

          <RozetVitrini rozetler={veri.rozetler} />
        </>
      )}
    </ScrollView>
  );
}

function ProfilBasligi({ veri, onCikis }: { veri: ProfilYaniti; onCikis: () => void }) {
  const { kullanici } = veri;
  const seviyeAdi = SEVIYE_ADLARI[kullanici.seviye] ?? "Kaşif";

  // Bu seviyenin başlangıcı ile sonraki eşik arasında nerede olduğumuz.
  const taban = SEVIYE_ESIKLERI[kullanici.seviye - 1] ?? 0;
  const tavan = SEVIYE_ESIKLERI[kullanici.seviye] ?? kullanici.puan;
  const yuzde = tavan > taban ? (kullanici.puan - taban) / (tavan - taban) : 1;

  return (
    <Animated.View entering={FadeInDown.duration(420).springify()} style={{ gap: bosluk.l }}>
      <View style={stiller.baslikSatiri}>
        <SeviyeHalkasi yuzde={yuzde} boyut={78}>
          <LinearGradient
            colors={[renkler.vurgu, "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={stiller.avatar}
          >
            <Text style={stiller.avatarHarfi}>
              {kullanici.name.trim().charAt(0).toLocaleUpperCase("tr")}
            </Text>
          </LinearGradient>
        </SeviyeHalkasi>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={stiller.adSatiri}>
            <Text style={[yazi.ekranBasligi, { fontSize: 22, flexShrink: 1 }]} numberOfLines={1}>
              {kullanici.name}
            </Text>
            {kullanici.plusUyeMi ? <PlusRozeti /> : null}
          </View>
          <Text style={stiller.seviyeMetni}>
            🏆 Seviye {kullanici.seviye} · {seviyeAdi}
          </Text>
        </View>

        <Basilabilir
          style={stiller.cikisButonu}
          onPress={onCikis}
          accessibilityRole="button"
          accessibilityLabel="Çıkış yap"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke={renkler.metin.soluk}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Basilabilir>
      </View>

      {kullanici.sonrakiSeviyeyeKalan !== null ? (
        <View style={{ gap: bosluk.s }}>
          <IlerlemeCubugu yuzde={yuzde} />
          <Text style={stiller.ilerlemeMetni}>
            Sonraki seviyeye{" "}
            <Text style={{ color: renkler.metin.ana }}>{kullanici.sonrakiSeviyeyeKalan}</Text> puan
            kaldı
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

/**
 * Plus rozeti.
 *
 * Ad ile rozet aynı satırda ama kırpma YALNIZCA ada uygulanıyor
 * (`flexShrink` adda, rozette `shrink: 0`): uzun bir isim rozetin
 * üstüne binip "Plus" yazısını yarım bırakıyordu.
 */
function PlusRozeti() {
  return (
    <View style={stiller.plusRozeti}>
      <Text style={stiller.plusMetni}>👑 Plus</Text>
    </View>
  );
}

const stiller = StyleSheet.create({
  merkez: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.l,
    padding: bosluk.xl,
    backgroundColor: renkler.zemin,
  },
  girisButonu: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.xxl,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  baslikSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.l },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHarfi: {
    ...yazi.sayi,
    fontSize: 26,
    color: "#FFFFFF",
  },
  adSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.s, minWidth: 0 },
  plusRozeti: {
    flexShrink: 0,
    backgroundColor: renkler.odulSoluk,
    paddingHorizontal: bosluk.s,
    paddingVertical: 3,
    borderRadius: yaricap.tam,
  },
  plusMetni: {
    ...yazi.kucuk,
    fontSize: 11,
    color: renkler.odulParlak,
    fontWeight: "600",
  },
  seviyeMetni: { ...yazi.govde, fontSize: 13, color: renkler.vurguParlak },
  cikisButonu: {
    width: 44,
    height: 44,
    minHeight: 44,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: renkler.katman,
  },
  ilerlemeMetni: { ...yazi.kucuk, textAlign: "center" },
});
