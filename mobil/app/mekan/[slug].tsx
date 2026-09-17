import { useEffect } from "react";
import { View, Text, StyleSheet, Linking, Platform, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { renkler, yazi, bosluk, yaricap, golge, isima, turRenkleri, turSimgeleri } from "../../src/tasarim";
import { API_TABAN } from "../../src/api/istemci";
import { useVeri } from "../../src/api/useVeri";
import type { MekanDetayYaniti } from "../../src/api/tipler";
import { Basilabilir } from "../../src/bilesenler/Basilabilir";
import { useOturum } from "../../src/store/oturum";
import { useFavoriler } from "../../src/store/favoriler";
import { Cip } from "../../src/bilesenler/Cip";
import { AcikRozeti } from "../../src/bilesenler/AcikRozeti";
import { ParalaksBaslik, KAPAK_YUKSEKLIGI } from "../../src/ozellikler/mekan/ParalaksBaslik";
import { MenuBolumu } from "../../src/ozellikler/mekan/MenuBolumu";
import { YorumBolumu } from "../../src/ozellikler/mekan/YorumBolumu";
import {
  fiyatIsareti,
  ozellikAdlari,
  ozellikSimgeleri,
  puanMetni,
  turAdi,
} from "../../src/ozellikler/mekan/etiketler";

/**
 * Mekan detay ekranı.
 *
 * Uygulamada bir mekanın tam sayfası HİÇ YOKTU: haritada ve Keşfet'te
 * alttan açılan küçük panel, ad ve puandan başka bir şey gösteremiyordu.
 * Menü, doğrulanmış yorumlar, özellikler ve sipariş bağlantıları
 * sunucuda hazır duruyordu ama mobilde hiçbir yerden görünmüyordu.
 *
 * Sayfanın omurgası paralaks kapak (bkz. ParalaksBaslik): kaydırma
 * değeri tek bir `SharedValue` üzerinden hem fotoğrafa hem karartmaya
 * hem de yapışkan çubuğa dağıtılıyor, hepsi UI thread'inde.
 */
export default function MekanEkrani() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();

  // Önbellekli: daha önce açılmış bir mekan internetsiz de görüntülenebilsin.
  const { veri, hata, cevrimdisi, yenile } = useVeri<MekanDetayYaniti>(
    `/api/app/mekanlar/${slug}`,
    { onbellek: true },
  );

  const girisli = useOturum((s) => s.durum === "girisli");
  const favoriIdler = useFavoriler((s) => s.idler);
  const favoriDegistir = useFavoriler((s) => s.degistir);
  const favorileriYukle = useFavoriler((s) => s.yukle);
  const favoriMekanlar = useFavoriler((s) => s.mekanlar);

  // Liste bir kez çekiliyor; kalbin dolu mu boş mu olacağını bilmenin
  // başka yolu yok (detay ucu favori bilgisi taşımıyor).
  useEffect(() => {
    if (girisli && favoriMekanlar === null) void favorileriYukle();
  }, [girisli, favoriMekanlar, favorileriYukle]);
  const kaydirma = useSharedValue(0);
  const kaydirmaOlayi = useAnimatedScrollHandler((olay) => {
    kaydirma.value = olay.contentOffset.y;
  });

  /**
   * Geri dönüş.
   *
   * `canGoBack()` doğru dese bile geri gidilemeyebiliyor: sayfa derin
   * bağlantıyla (paylaşılan link, bildirim) doğrudan açıldığında yığında
   * geri dönülecek bir ekran olmuyor ve navigatör "GO_BACK was not
   * handled" diye uyarıyordu. Deneyip başarısız olursa Keşfet'e
   * düşüyoruz — kullanıcı hiçbir durumda çıkışsız kalmıyor.
   */
  const geri = () => {
    try {
      if (router.canGoBack()) {
        router.back();
        return;
      }
    } catch {
      // Aşağıdaki yedek yola düşülüyor.
    }
    router.replace("/kesfet");
  };

  /**
   * Hata ekranı SEBEBE GÖRE ayrılıyor. Önceden her hata "Mekan bulunamadı"
   * diyordu — bağlantı koptuğunda da. Kullanıcı mekanın kapandığını ya da
   * silindiğini sanıyor, oysa yapması gereken yalnızca tekrar denemekti.
   */
  if (hata && !veri) {
    return (
      <View style={[stiller.merkez, { paddingTop: guvenliAlan.top }]}>
        <Text style={yazi.bolumBasligi}>
          {cevrimdisi ? "Bağlantı kurulamadı" : "Mekan bulunamadı"}
        </Text>
        <Text style={[yazi.govde, { textAlign: "center" }]}>
          {cevrimdisi ? "İnternetini kontrol edip tekrar dene." : hata}
        </Text>
        {cevrimdisi ? (
          <Basilabilir style={stiller.anaButon} onPress={yenile} titresim="orta">
            <Text style={yazi.buton}>Tekrar dene</Text>
          </Basilabilir>
        ) : null}
        <Basilabilir
          style={[stiller.anaButon, cevrimdisi && { backgroundColor: renkler.katman }]}
          onPress={geri}
          titresim="orta"
        >
          <Text style={yazi.buton}>Geri dön</Text>
        </Basilabilir>
      </View>
    );
  }

  if (!veri) {
    return (
      <View style={stiller.merkez}>
        <ActivityIndicator color={renkler.vurguParlak} />
      </View>
    );
  }

  const mekan = veri.mekan;
  const turRengi = turRenkleri[mekan.tur] ?? renkler.vurgu;
  const puan = puanMetni(mekan.puan);
  const fiyat = fiyatIsareti(mekan.fiyatSegmenti);
  const etkinlik = mekan.etkinlikler[0] ?? null;
  const ozellikler = mekan.ozellikler.filter((o) => o in ozellikAdlari);

  const konumVar = mekan.konum.enlem !== null && mekan.konum.boylam !== null;

  function yolTarifi() {
    if (!konumVar) return;
    const hedef = `${mekan.konum.enlem},${mekan.konum.boylam}`;
    // Apple Haritalar iOS'ta varsayılan; Android'de `geo:` şeması
    // kullanıcının kurulu harita uygulamasını açıyor.
    const adres =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${hedef}`
        : `geo:${hedef}?q=${hedef}(${encodeURIComponent(mekan.ad)})`;
    void Linking.openURL(adres);
  }

  /**
   * Favorileme kime ait olduğu bilinmesi gereken bir eylem; girişsiz
   * kullanıcı kalbe basınca giriş ekranına gidiyor (web'deki davranışın
   * aynısı). Kalp yine de GÖSTERİLİYOR: mekan sayfası herkese açık ve
   * düğmeyi gizlemek, özelliğin var olduğunu da gizlemek olurdu.
   */
  function favorile() {
    if (!girisli) {
      router.push("/giris");
      return;
    }
    void favoriDegistir({
      id: mekan.id,
      slug: mekan.slug,
      ad: mekan.ad,
      logoUrl: mekan.logoUrl,
      markaRengi: mekan.markaRengi,
    });
  }

  function paylas() {
    void Share.share({
      message: `${mekan.ad} — Biyerlere'de keşfet: ${API_TABAN}/mekan/${mekan.slug}`,
    });
  }

  const siparis = Object.entries(mekan.siparisLinkleri).filter(([, url]) => url) as [
    string,
    string,
  ][];

  return (
    <View style={stiller.kap}>
      <ParalaksBaslik
        kaydirma={kaydirma}
        kapakUrl={mekan.kapakUrl}
        markaRengi={mekan.markaRengi}
        ad={mekan.ad}
        ustBosluk={guvenliAlan.top}
        onGeri={geri}
        onPaylas={paylas}
        onFavori={favorile}
        favoriMi={girisli && favoriIdler.has(mekan.id)}
      />

      <Animated.ScrollView
        onScroll={kaydirmaOlayi}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: guvenliAlan.bottom + bosluk.xxxl }}
      >
        {/* Kapağın yüksekliği kadar saydam boşluk: içerik fotoğrafın
            üstünden başlayıp onu yukarı doğru örtüyor. */}
        <View style={{ height: KAPAK_YUKSEKLIGI - 72 }} pointerEvents="none" />

        <View style={stiller.govde}>
          <Animated.View entering={FadeInDown.duration(380).springify()} style={{ gap: bosluk.s }}>
            <View style={stiller.turSatiri}>
              <Text style={{ fontSize: 13 }}>{turSimgeleri[mekan.tur] ?? "📍"}</Text>
              <Text style={[stiller.tur, { color: turRengi }]}>{turAdi(mekan.tur)}</Text>
              {mekan.biyerlerePlusOrtagi ? (
                <View style={stiller.plusRozeti}>
                  <Text style={stiller.plusMetni}>👑 Plus ortağı</Text>
                </View>
              ) : null}
            </View>

            <Text style={stiller.baslik}>{mekan.ad}</Text>

            <View style={stiller.bilgiSatiri}>
              {puan ? (
                <Text style={stiller.puan}>
                  ⭐ {puan}
                  <Text style={stiller.soluk}>
                    {"  "}({mekan.degerlendirmeSayisi} değerlendirme)
                  </Text>
                </Text>
              ) : (
                <Text style={stiller.soluk}>Henüz puanlanmamış</Text>
              )}
              {fiyat ? <Text style={stiller.soluk}>·  {fiyat}</Text> : null}
            </View>

            {/* Mekan sayfası "gideyim mi" kararının verildiği yer: açıklık
                bilgisi yol tarifi düğmesinin hemen üstünde duruyor. */}
            <View style={{ flexDirection: "row" }}>
              <AcikRozeti durum={mekan.acik} sonrakiAcilis={mekan.sonrakiAcilis} />
            </View>

            {mekan.adres ? <Text style={yazi.kucuk}>📍 {mekan.adres}</Text> : null}
          </Animated.View>

          {/* Aksiyon satırı — sayfanın ilk ekranında görünen tek eylem
              kümesi; aşağıda tekrar etmiyor. */}
          <View style={stiller.aksiyonSatiri}>
            {konumVar ? (
              <AksiyonDugmesi
                etiket="Yol tarifi"
                yol="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z M12 10a1.6 1.6 0 100-3.2A1.6 1.6 0 0012 10z"
                birincil
                onPress={yolTarifi}
              />
            ) : null}
            {mekan.telefon ? (
              <AksiyonDugmesi
                etiket="Ara"
                yol="M4.5 4.5h4l1.6 4-2.2 1.6a12 12 0 006 6l1.6-2.2 4 1.6v4a1.5 1.5 0 01-1.7 1.5A17 17 0 013 6.2 1.5 1.5 0 014.5 4.5z"
                onPress={() => void Linking.openURL(`tel:${mekan.telefon}`)}
              />
            ) : null}
            {mekan.instagram ? (
              <AksiyonDugmesi
                etiket="Instagram"
                yol="M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z M12 8.4A3.6 3.6 0 1012 15.6 3.6 3.6 0 0012 8.4z M17.2 6.9v.01"
                onPress={() => void Linking.openURL(mekan.instagram!)}
              />
            ) : null}
            {/* Buluşma açma akışı HER ZAMAN bir mekan sayfasından
                başlıyor: "nerede buluşalım" kararı zaten burada veriliyor,
                formun içinde 52 mekanlık bir seçiciyle tekrar sorulmuyor. */}
            <AksiyonDugmesi
              etiket="Buluşma aç"
              yol="M17 20h5v-1.5a3.5 3.5 0 00-5-3.2M7 20H2v-1.5a3.5 3.5 0 015-3.2M12 12.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M12 20v-4"
              onPress={() =>
                router.push({
                  pathname: "/etkinlik-ac",
                  params: { mekanId: mekan.id, mekanAd: mekan.ad },
                })
              }
            />
          </View>

          {etkinlik ? (
            <Animated.View entering={FadeInDown.delay(80).duration(380).springify()}>
              <View style={[stiller.etkinlikKarti, isima(renkler.odul)]}>
                <Text style={stiller.etkinlikEtiketi}>🔥 BU HAFTA</Text>
                <Text style={stiller.etkinlikBasligi}>{etkinlik.baslik}</Text>
                {etkinlik.aciklama ? (
                  <Text style={yazi.govde}>{etkinlik.aciklama}</Text>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          {ozellikler.length > 0 ? (
            <View style={{ gap: bosluk.s }}>
              <Text style={yazi.bolumBasligi}>Bu mekanda</Text>
              <View style={stiller.ozellikIzgarasi}>
                {ozellikler.map((o) => (
                  <Cip key={o} metin={ozellikAdlari[o]} simge={ozellikSimgeleri[o]} />
                ))}
              </View>
            </View>
          ) : null}

          <MenuBolumu menu={mekan.menu} />

          {siparis.length > 0 ? (
            <View style={{ gap: bosluk.s }}>
              <Text style={yazi.bolumBasligi}>Eve sipariş</Text>
              <View style={stiller.ozellikIzgarasi}>
                {siparis.map(([ad, url]) => (
                  <Cip
                    key={ad}
                    metin={ad.charAt(0).toLocaleUpperCase("tr") + ad.slice(1)}
                    onPress={() => void Linking.openURL(url)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <YorumBolumu
            yorumlar={mekan.dogrulanmisYorumlar}
            toplamDegerlendirme={mekan.degerlendirmeSayisi}
          />

          {/* Uygulamanın çekirdek eylemi sayfanın sonunda hatırlatılıyor:
              ziyaret ancak masada karekod okutunca doğrulanıyor. */}
          <View style={stiller.ipucu}>
            <Text style={stiller.ipucuBasligi}>Buradaysan puan kazan</Text>
            <Text style={yazi.govde}>
              Masadaki karekodu okut; ziyaretin doğrulansın, {mekan.ad} sadakat kartına bir
              damga eklensin.
            </Text>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function AksiyonDugmesi({
  etiket,
  yol,
  birincil = false,
  onPress,
}: {
  etiket: string;
  yol: string;
  birincil?: boolean;
  onPress: () => void;
}) {
  return (
    <Basilabilir
      onPress={onPress}
      olcek={0.94}
      titresim="orta"
      style={[stiller.aksiyon, birincil ? stiller.aksiyonBirincil : stiller.aksiyonIkincil]}
      accessibilityRole="button"
      accessibilityLabel={etiket}
    >
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
        <Path
          d={yol}
          stroke={birincil ? "#FFFFFF" : renkler.metin.ana}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={[stiller.aksiyonMetni, birincil && { color: "#FFFFFF" }]}>{etiket}</Text>
    </Basilabilir>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  merkez: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.l,
    padding: bosluk.xl,
    backgroundColor: renkler.zemin,
  },
  anaButon: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.xxl,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  govde: {
    paddingHorizontal: bosluk.xl,
    paddingTop: bosluk.l,
    gap: bosluk.xxl,
    // Sayfa gövdesi fotoğrafın üstüne biniyor; üst köşeler yuvarlak
    // olunca "fotoğrafın üstüne çekilmiş bir kağıt" hissi doğuyor.
    borderTopLeftRadius: yaricap.xxl,
    borderTopRightRadius: yaricap.xxl,
    backgroundColor: renkler.zemin,
  },
  turSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.xs },
  tur: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  plusRozeti: {
    marginLeft: bosluk.xs,
    paddingHorizontal: bosluk.s,
    paddingVertical: 3,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.odulSoluk,
  },
  plusMetni: { fontSize: 10, fontWeight: "700", color: renkler.odulParlak },
  baslik: { ...yazi.ekranBasligi, fontSize: 30, lineHeight: 36 },
  bilgiSatiri: { flexDirection: "row", alignItems: "center", gap: bosluk.s, flexWrap: "wrap" },
  puan: { fontSize: 14, fontWeight: "700", color: renkler.odulParlak },
  soluk: { fontSize: 13, fontWeight: "400", color: renkler.metin.soluk },
  aksiyonSatiri: { flexDirection: "row", gap: bosluk.s, flexWrap: "wrap" },
  aksiyon: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.s,
    paddingHorizontal: bosluk.l,
    borderRadius: yaricap.tam,
  },
  aksiyonBirincil: { backgroundColor: renkler.vurgu },
  aksiyonIkincil: {
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
  },
  aksiyonMetni: { fontSize: 14, fontWeight: "600", color: renkler.metin.ana },
  etkinlikKarti: {
    gap: 6,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.odulSoluk,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245,165,36,0.35)",
    ...golge("s"),
  },
  etkinlikEtiketi: { ...yazi.etiket, fontSize: 10, color: renkler.odulParlak },
  etkinlikBasligi: { ...yazi.bolumBasligi, fontSize: 17 },
  ozellikIzgarasi: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.s },
  ipucu: {
    gap: 6,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.vurguSoluk,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(124,107,255,0.3)",
  },
  ipucuBasligi: { ...yazi.kartBasligi, color: renkler.vurguParlak },
});
