import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  Extrapolation,
} from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, SEKME_YUKSEKLIGI } from "../../src/tasarim";
import { TARA_DUGMESI_PAYI } from "../../src/bilesenler/TaraDugmesi";
import { useVeri } from "../../src/api/useVeri";
import type { MekanListesi, MekanOzet } from "../../src/api/tipler";
import { useOturum } from "../../src/store/oturum";
import { useBildirimler, yeniBildirimSayisi } from "../../src/store/bildirimler";
import { konumuBildir } from "../../src/push/konum";
import { Iskelet } from "../../src/bilesenler/Iskelet";
import { BosDurum } from "../../src/bilesenler/BosDurum";
import { Basilabilir } from "../../src/bilesenler/Basilabilir";
import { MekanSayfasi } from "../../src/ozellikler/harita/MekanSayfasi";
import { Suzgec, BOS_SUZGEC, suzgecBosMu, type SuzgecDurumu } from "../../src/ozellikler/kesfet/Suzgec";
import { VitrinKarti } from "../../src/ozellikler/kesfet/VitrinKarti";
import { MekanKarti } from "../../src/ozellikler/kesfet/MekanKarti";
import { MekanSatiri, SATIR_YUKSEKLIGI } from "../../src/ozellikler/kesfet/MekanSatiri";

const AnimasyonluListe = Animated.createAnimatedComponent(FlatList<MekanOzet>);

/** Selamlama satırının kaybolduğu kaydırma mesafesi. */
const BASLIK_YUKSEKLIGI = 58;

/**
 * Konum verildiğinde uygulanan yarıçap.
 *
 * Sunucunun varsayılanı 5 km ("çevremde" için doğru), ama Keşfet'in alt
 * listesi ŞEHRİN TAMAMINI göstermeli — 5 km'lik varsayılanla Kadıköy'deki
 * kullanıcı Beyoğlu'ndaki mekanların hiçbirini göremiyordu. Yakınlık
 * ayrı bir bölüm olarak zaten sunuluyor.
 */
const YARICAP_METRE = 50_000;

/** "Yakınında" bölümünün eşiği — bundan uzağı yakın sayılmaz. */
const YAKIN_ESIK_METRE = 3_000;

export default function KesfetEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const kullanici = useOturum((s) => s.kullanici);

  const [suzgec, setSuzgec] = useState<SuzgecDurumu>(BOS_SUZGEC);
  const [aramaGecikmeli, setAramaGecikmeli] = useState("");
  const [konum, setKonum] = useState<{ enlem: number; boylam: number } | null>(null);
  const [seciliId, setSeciliId] = useState<string | null>(null);

  // Her tuş vuruşunda istek atmak, 52 mekanlık listede saniyede beş
  // gereksiz sorgu demekti; kullanıcı yazmayı bırakınca aranıyor.
  useEffect(() => {
    const zamanlayici = setTimeout(() => setAramaGecikmeli(suzgec.arama.trim()), 300);
    return () => clearTimeout(zamanlayici);
  }, [suzgec.arama]);

  // Konum İZİN VARSA alınıyor, yoksa istenmiyor: Keşfet'i açmak konum
  // izni istemek için bir gerekçe değil (aynı ilke için bkz. push/konum.ts).
  // İzin verilmişse mesafe rozetleri ve "Yakınında" bölümü açılıyor.
  useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const son = await Location.getLastKnownPositionAsync();
        if (!son || iptal) return;
        setKonum({ enlem: son.coords.latitude, boylam: son.coords.longitude });
      } catch {
        // Konum tamamen isteğe bağlı; alınamazsa ekran mesafesiz çalışır.
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    if (kullanici) void konumuBildir();
  }, [kullanici]);

  // Zil rozeti için: liste bir kez çekiliyor, "en son ne zaman baktı"
  // izi de cihazdan okunuyor. İkisi olmadan rozette gösterilecek bir
  // sayı yok.
  const bildirimOgeleri = useBildirimler((s) => s.ogeler);
  const sonGorulme = useBildirimler((s) => s.sonGorulme);
  const bildirimleriYukle = useBildirimler((s) => s.yukle);
  const bildirimleriHazirla = useBildirimler((s) => s.hazirla);

  useEffect(() => {
    if (!kullanici) return;
    void bildirimleriHazirla();
    void bildirimleriYukle();
  }, [kullanici, bildirimleriHazirla, bildirimleriYukle]);

  const yeniBildirim = yeniBildirimSayisi(bildirimOgeleri, sonGorulme);

  // Süzme SUNUCUDA: kurallar (özellik kesişimi, mesafe, sıralama) web ile
  // tek yerden paylaşılıyor — bkz. lib/kesfet.ts.
  const yol = useMemo(() => {
    const p = new URLSearchParams();
    if (aramaGecikmeli) p.set("q", aramaGecikmeli);
    if (suzgec.tur) p.set("tur", suzgec.tur);
    if (suzgec.ozellikler.length > 0) p.set("ozellik", suzgec.ozellikler.join(","));
    if (suzgec.yalnizcaAcik) p.set("acik", "1");
    if (konum) {
      p.set("enlem", String(konum.enlem));
      p.set("boylam", String(konum.boylam));
      p.set("mesafe", String(YARICAP_METRE));
    }
    const sorgu = p.toString();
    return `/api/app/mekanlar${sorgu ? `?${sorgu}` : ""}`;
  }, [aramaGecikmeli, suzgec.tur, suzgec.ozellikler, suzgec.yalnizcaAcik, konum]);

  const { veri, yenileniyor, yenile } = useVeri<MekanListesi>(yol);

  const mekanlar = useMemo(() => veri?.mekanlar ?? [], [veri]);
  const suzuluyor = !suzgecBosMu({ ...suzgec, arama: aramaGecikmeli });

  const vitrin = useMemo(
    () =>
      mekanlar.find((m) => m.sponsorluMu) ??
      mekanlar.find((m) => m.etkinlikler.length > 0) ??
      mekanlar[0] ??
      null,
    [mekanlar],
  );
  const yakindakiler = useMemo(
    () =>
      konum
        ? mekanlar.filter(
            (m) => m.mesafeMetre !== null && m.mesafeMetre <= YAKIN_ESIK_METRE,
          ).slice(0, 10)
        : [],
    [mekanlar, konum],
  );
  const etkinlikliler = useMemo(
    () => mekanlar.filter((m) => m.etkinlikler.length > 0).slice(0, 10),
    [mekanlar],
  );

  const kaydirma = useSharedValue(0);
  const kaydirmaOlayi = useAnimatedScrollHandler((olay) => {
    kaydirma.value = olay.contentOffset.y;
  });

  // Kaydırınca selamlama satırı katlanıyor, arama ve çipler kalıyor:
  // ekranın üstündeki en kalıcı olması gereken şey filtre çubuğu.
  const selamlamaStili = useAnimatedStyle(() => ({
    height: interpolate(kaydirma.value, [0, BASLIK_YUKSEKLIGI], [BASLIK_YUKSEKLIGI, 0], Extrapolation.CLAMP),
    opacity: interpolate(kaydirma.value, [0, BASLIK_YUKSEKLIGI * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  // Kartlara dokunmak eskiden HİÇBİR ŞEY yapmıyordu: Keşfet'teki her kart
  // ölü bir düğmeydi. Haritadakiyle aynı panel açılıyor — ayrı bir detay
  // rotası, kullanıcıyı listedeki yerinden koparıp her mekan için geri
  // tuşuna basmaya zorlardı; panel kapanınca liste olduğu yerde kalıyor.
  const mekanaGit = useCallback((mekan: MekanOzet) => setSeciliId(mekan.id), []);
  const secili = useMemo(
    () => mekanlar.find((m) => m.id === seciliId) ?? null,
    [mekanlar, seciliId],
  );

  const listeBasligi = (
    <View style={{ gap: bosluk.xxl, paddingBottom: bosluk.xl }}>
      {vitrin ? <VitrinKarti mekan={vitrin} onPress={() => mekanaGit(vitrin)} /> : null}
      {yakindakiler.length > 0 ? (
        <Serit baslik="Yakınında" mekanlar={yakindakiler} onSec={mekanaGit} />
      ) : null}
      {etkinlikliler.length > 0 ? (
        <Serit baslik="Bu hafta etkinlik var 🔥" mekanlar={etkinlikliler} onSec={mekanaGit} />
      ) : null}
      <Text style={stiller.bolumBasligi}>
        {suzuluyor ? `Sonuçlar · ${mekanlar.length}` : `Tüm mekanlar · ${mekanlar.length}`}
      </Text>
    </View>
  );

  return (
    <View style={stiller.kap}>
      <View style={[stiller.ustBlok, { paddingTop: guvenliAlan.top + bosluk.s }]}>
        <Animated.View style={[stiller.selamlama, selamlamaStili]}>
          {/* İsim KÜÇÜK satırda, soru büyük satırda. Önce ikisi tek
              satırdaydı ("Muhammed, bugün nereye?") ve puan çipiyle
              birlikte uzun isimlerde asıl soru kırpılıyordu — ekranın en
              büyük yazısı yarım kalıyordu. */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={yazi.kucuk} numberOfLines={1}>
              {kullanici ? `${selamlama()}, ${kullanici.name.split(" ")[0]}` : selamlama()}
            </Text>
            <Text style={stiller.ekranBasligi} numberOfLines={1}>
              Bugün nereye?
            </Text>
          </View>
          {kullanici ? (
            <>
              <Basilabilir
                onPress={() => router.push("/bildirimler")}
                olcek={0.9}
                style={stiller.zil}
                accessibilityRole="button"
                accessibilityLabel={
                  yeniBildirim > 0
                    ? `Bildirimler, ${yeniBildirim} yeni`
                    : "Bildirimler"
                }
              >
                <Text style={stiller.zilSimgesi}>🔔</Text>
                {/* Rozet SAYI TAŞIMIYOR, yalnızca "yeni var" diyor:
                    ziline 23 yazan bir uygulama, kullanıcıyı temizlemesi
                    gereken bir görev listesiyle karşılıyor. */}
                {yeniBildirim > 0 ? <View style={stiller.zilNoktasi} /> : null}
              </Basilabilir>
              <Basilabilir
                onPress={() => router.push("/profil")}
                olcek={0.92}
                style={stiller.puanCipi}
                accessibilityLabel={`${kullanici.puan} kaşif puanı`}
              >
                <Text style={stiller.puanSimgesi}>⚡</Text>
                <Text style={stiller.puanMetni}>{kullanici.puan}</Text>
              </Basilabilir>
            </>
          ) : null}
        </Animated.View>

        <Suzgec durum={suzgec} onDegis={setSuzgec} />
      </View>

      {!veri ? (
        <YuklemeIskeleti />
      ) : mekanlar.length === 0 ? (
        <BosDurum
          cizim="arama"
          baslik="Aramana uyan mekan yok"
          aciklama="Filtreleri gevşetmeyi ya da başka bir kelime denemeyi öneririm."
          butonMetni="Filtreleri temizle"
          onButon={() => setSuzgec(BOS_SUZGEC)}
        />
      ) : (
        <AnimasyonluListe
          data={mekanlar}
          keyExtractor={(mekan) => mekan.id}
          onScroll={kaydirmaOlayi}
          scrollEventThrottle={16}
          ListHeaderComponent={listeBasligi}
          renderItem={({ item }) => (
            <MekanSatiri mekan={item} onPress={() => mekanaGit(item)} />
          )}
          // Satır yüksekliği sabit; ölçüm atlanınca 52 satırlık liste
          // gözle görülür biçimde daha akıcı kayıyor.
          getItemLayout={(_veri, indis) => ({
            length: SATIR_YUKSEKLIGI + bosluk.m,
            offset: (SATIR_YUKSEKLIGI + bosluk.m) * indis,
            index: indis,
          })}
          contentContainerStyle={{
            paddingTop: bosluk.l,
            // Yüzen tara düğmesi çubuğun üstünde duruyor; son satır
            // sürekli onun altında kalmasın diye fazladan pay.
            paddingBottom: SEKME_YUKSEKLIGI + guvenliAlan.bottom + TARA_DUGMESI_PAYI,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={yenile}
              tintColor={renkler.vurguParlak}
            />
          }
        />
      )}

      <MekanSayfasi mekan={secili} onKapat={() => setSeciliId(null)} />
    </View>
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
 * `snapToInterval` ile kart kart duruyor — serbest kaydırma şeridi yarım
 * kalmış bir kartla bırakıyordu.
 */
function Serit({
  baslik,
  mekanlar,
  onSec,
}: {
  baslik: string;
  mekanlar: MekanOzet[];
  onSec: (mekan: MekanOzet) => void;
}) {
  const genislik = 200;
  return (
    <View style={{ gap: bosluk.m }}>
      <Text style={stiller.bolumBasligi}>{baslik}</Text>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: bosluk.xl, gap: bosluk.m }}
        snapToInterval={genislik + bosluk.m}
        decelerationRate="fast"
      >
        {mekanlar.map((mekan, sira) => (
          <MekanKarti
            key={mekan.id}
            mekan={mekan}
            genislik={genislik}
            sira={sira}
            onPress={() => onSec(mekan)}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function YuklemeIskeleti() {
  return (
    <View style={{ gap: bosluk.xl, paddingTop: bosluk.l }}>
      <Iskelet yukseklik={228} kose={yaricap.xl} stil={{ marginHorizontal: bosluk.xl }} />
      <View style={{ gap: bosluk.m }}>
        <Iskelet genislik={140} yukseklik={20} stil={{ marginHorizontal: bosluk.xl }} />
        <View style={{ flexDirection: "row", gap: bosluk.m, paddingHorizontal: bosluk.xl }}>
          <Iskelet genislik={200} yukseklik={124} kose={yaricap.l} />
          <Iskelet genislik={200} yukseklik={124} kose={yaricap.l} />
        </View>
      </View>
      <View style={{ gap: bosluk.m, paddingHorizontal: bosluk.xl }}>
        <Iskelet yukseklik={SATIR_YUKSEKLIGI} kose={yaricap.l} />
        <Iskelet yukseklik={SATIR_YUKSEKLIGI} kose={yaricap.l} />
      </View>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  ustBlok: {
    paddingBottom: bosluk.m,
    gap: bosluk.m,
    backgroundColor: renkler.zemin,
    // Liste altından kayarken üst blok üstte kalsın.
    zIndex: 2,
  },
  selamlama: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    paddingHorizontal: bosluk.xl,
    overflow: "hidden",
  },
  ekranBasligi: { ...yazi.ekranBasligi, fontSize: 26, lineHeight: 32 },
  puanCipi: {
    minHeight: 0,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: bosluk.m,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.odulSoluk,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245,165,36,0.35)",
  },
  zil: {
    minHeight: 0,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katman,
  },
  zilSimgesi: { fontSize: 15 },
  zilNoktasi: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: renkler.uyari,
    borderWidth: 1.5,
    borderColor: renkler.katman,
  },
  puanSimgesi: { fontSize: 13 },
  puanMetni: {
    fontSize: 14,
    fontWeight: "700",
    color: renkler.odulParlak,
    fontVariant: ["tabular-nums"],
  },
  bolumBasligi: { ...yazi.bolumBasligi, paddingHorizontal: bosluk.xl },
});
