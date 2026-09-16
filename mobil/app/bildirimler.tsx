import { useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { renkler, yazi, bosluk, yaricap, isima } from "../src/tasarim";
import { useOturum } from "../src/store/oturum";
import { useBildirimler } from "../src/store/bildirimler";
import type { BildirimOgesi } from "../src/api/tipler";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { BosDurum } from "../src/bilesenler/BosDurum";
import { Iskelet } from "../src/bilesenler/Iskelet";
import { goreceliTarih } from "../src/ozellikler/profil/ZiyaretGecmisi";

/**
 * Bildirim merkezi.
 *
 * Uç (`/api/app/bildirimler`) aylardır çalışıyordu ve mobilde ona giden
 * hiçbir yol yoktu: kullanıcı rozet kazandığını ancak profildeki vitrine
 * bakarsa, favori mekanının duyurusunu ise hiç öğrenemiyordu. Push
 * bildirimi yalnızca flaş indirim için gidiyor; geri kalan her şey bu
 * ekranda birikiyor.
 *
 * Ekran açılınca "gördü" damgası basılıyor (bkz. store) — zil rozeti de
 * ondan sonrasını sayıyor.
 */
export default function BildirimlerEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const girisli = useOturum((s) => s.durum === "girisli");
  const oturumDurumu = useOturum((s) => s.durum);

  const ogeler = useBildirimler((s) => s.ogeler);
  const yukleniyor = useBildirimler((s) => s.yukleniyor);
  const yukle = useBildirimler((s) => s.yukle);
  const gorduOlarakIsaretle = useBildirimler((s) => s.gorduOlarakIsaretle);

  useEffect(() => {
    if (girisli) void yukle();
  }, [girisli, yukle]);

  // Damga, liste GELDİKTEN sonra basılıyor: en yeni öğenin tarihi
  // olmadan "buraya kadarını gördün" demek mümkün değil.
  useEffect(() => {
    if (ogeler && ogeler.length > 0) void gorduOlarakIsaretle();
  }, [ogeler, gorduOlarakIsaretle]);

  const ustBosluk = guvenliAlan.top + bosluk.s;

  if (oturumDurumu === "cikisli") {
    return (
      <View style={[stiller.kap, { paddingTop: ustBosluk }]}>
        <Baslik onGeri={() => router.back()} />
        <View style={stiller.merkez}>
          <Text style={yazi.bolumBasligi}>Bildirimlerini görmek için giriş yap</Text>
          <Basilabilir
            style={[stiller.girisButonu, isima(renkler.vurgu)]}
            onPress={() => router.push("/giris")}
            titresim="orta"
          >
            <Text style={yazi.buton}>Giriş yap</Text>
          </Basilabilir>
        </View>
      </View>
    );
  }

  return (
    <View style={[stiller.kap, { paddingTop: ustBosluk }]}>
      <Baslik onGeri={() => router.back()} />

      {!ogeler ? (
        <View style={{ gap: bosluk.s, paddingHorizontal: bosluk.xl, paddingTop: bosluk.m }}>
          <Iskelet yukseklik={72} kose={yaricap.l} />
          <Iskelet yukseklik={72} kose={yaricap.l} />
          <Iskelet yukseklik={72} kose={yaricap.l} />
        </View>
      ) : ogeler.length === 0 ? (
        <BosDurum
          cizim="bildirim"
          baslik="Henüz bildirimin yok"
          aciklama="Rozet kazandığında ve favori mekanların bir şey duyurduğunda burada görünecek."
          butonMetni="Mekanları keşfet"
          onButon={() => router.replace("/kesfet")}
        />
      ) : (
        <FlatList
          data={ogeler}
          keyExtractor={(oge) => oge.id}
          renderItem={({ item, index }) => (
            <Satir oge={item} sira={index} onPress={() => router.push(item.href as never)} />
          )}
          contentContainerStyle={{
            padding: bosluk.xl,
            paddingBottom: guvenliAlan.bottom + bosluk.xxl,
            gap: bosluk.s,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={yukle}
              tintColor={renkler.vurguParlak}
            />
          }
        />
      )}
    </View>
  );
}

function Baslik({ onGeri }: { onGeri: () => void }) {
  return (
    <View style={stiller.baslikSatiri}>
      <Basilabilir
        onPress={onGeri}
        style={stiller.geriDugmesi}
        olcek={0.88}
        accessibilityRole="button"
        accessibilityLabel="Geri"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 19l-7-7 7-7"
            stroke={renkler.metin.ana}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Basilabilir>
      <Text style={yazi.ekranBasligi}>Bildirimler</Text>
    </View>
  );
}

const SIMGELER: Record<BildirimOgesi["tur"], string> = {
  rozet: "🏅",
  kupon: "🎟️",
  duyuru: "📣",
};

function Satir({
  oge,
  sira,
  onPress,
}: {
  oge: BildirimOgesi;
  sira: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(sira, 8) * 40).duration(320).springify()}>
      <Basilabilir
        onPress={onPress}
        style={stiller.satir}
        olcek={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${oge.baslik}, ${goreceliTarih(oge.tarih)}`}
      >
        <View style={stiller.simge}>
          <Text style={{ fontSize: 17 }}>{SIMGELER[oge.tur]}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={yazi.kartBasligi} numberOfLines={2}>
            {oge.baslik}
          </Text>
          {oge.aciklama ? (
            <Text style={yazi.kucuk} numberOfLines={2}>
              {oge.aciklama}
            </Text>
          ) : null}
          <Text style={stiller.tarih}>{goreceliTarih(oge.tarih)}</Text>
        </View>
      </Basilabilir>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  baslikSatiri: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    paddingHorizontal: bosluk.xl,
    paddingBottom: bosluk.m,
  },
  geriDugmesi: {
    width: 40,
    height: 40,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katman,
  },
  merkez: { flex: 1, alignItems: "center", justifyContent: "center", gap: bosluk.l },
  girisButonu: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.xxl,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  satir: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: bosluk.m,
    padding: bosluk.m,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  simge: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.m,
    backgroundColor: renkler.katmanYuksek,
  },
  tarih: { ...yazi.kucuk, fontSize: 11, color: renkler.metin.soluk },
});
