import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk, yaricap, golge } from "../../src/tasarim";
import { useVeri } from "../../src/api/useVeri";
import type { MekanListesi, MekanOzet } from "../../src/api/tipler";
import { CamYuzey } from "../../src/bilesenler/CamYuzey";
import { Basilabilir } from "../../src/bilesenler/Basilabilir";
import { HaritaGorunumu, type HaritaMesaji } from "../../src/ozellikler/harita/HaritaGorunumu";
import { haritaHtmlUret } from "../../src/ozellikler/harita/haritaHtml";
import { MekanSayfasi } from "../../src/ozellikler/harita/MekanSayfasi";

/** Konum yokken haritanın açılacağı nokta — İstanbul merkezi. */
const VARSAYILAN_MERKEZ = { enlem: 41.0082, boylam: 28.9784 };

export default function HaritaEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const { veri, hata, getir } = useVeri<MekanListesi>("/api/app/mekanlar");
  const mekanlar: MekanOzet[] | null = veri?.mekanlar ?? null;

  /**
   * HTML yalnızca mekan listesi değiştiğinde yeniden üretiliyor.
   *
   * Seçili pin bu bağımlılığa DAHİL DEĞİL — olsaydı her dokunuşta
   * WebView'e yeni bir belge yüklenir, harita başa sarıp kullanıcının
   * kaydırdığı yeri kaybederdi. Seçim vurgusunu sayfanın kendi
   * JavaScript'i yönetiyor.
   */
  const html = useMemo(
    () => (mekanlar ? haritaHtmlUret(mekanlar, VARSAYILAN_MERKEZ, null) : ""),
    [mekanlar],
  );

  const secili = useMemo(
    () => mekanlar?.find((m) => m.id === seciliId) ?? null,
    [mekanlar, seciliId],
  );

  const mesajAl = useCallback((mesaj: HaritaMesaji) => {
    if (mesaj.tur === "mekanSecildi") setSeciliId(mesaj.id);
    else if (mesaj.tur === "secimTemizlendi") setSeciliId(null);
  }, []);

  return (
    <View style={stiller.kap}>
      {mekanlar ? (
        <HaritaGorunumu html={html} onMesaj={mesajAl} />
      ) : (
        <View style={stiller.merkez}>
          {hata ? (
            <>
              <Text style={stiller.hataBasligi}>Harita yüklenemedi</Text>
              <Text style={stiller.hataMetni}>{hata}</Text>
              <Basilabilir style={stiller.tekrarButonu} onPress={getir} titresim="orta">
                <Text style={yazi.buton}>Tekrar dene</Text>
              </Basilabilir>
            </>
          ) : (
            <ActivityIndicator color={renkler.vurguParlak} />
          )}
        </View>
      )}

      {/* Başlık haritanın ÜSTÜNDE yüzen bir cam şerit: harita için ayrılan
          dikey alanı bir başlık çubuğuna vermek, telefonda haritayı
          gözle görülür şekilde küçültüyordu. */}
      <CamYuzey
        yogunluk={40}
        stil={[stiller.baslikSeridi, { paddingTop: guvenliAlan.top + bosluk.s }]}
      >
        <Text style={yazi.bolumBasligi}>Yakınındaki mekanlar</Text>
        {mekanlar ? (
          <Text style={yazi.kucuk}>{mekanlar.length} mekan · pine dokun</Text>
        ) : null}
      </CamYuzey>

      <MekanSayfasi mekan={secili} onKapat={() => setSeciliId(null)} />
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  merkez: { flex: 1, alignItems: "center", justifyContent: "center", gap: bosluk.m, padding: bosluk.xl },
  baslikSeridi: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: bosluk.xl,
    paddingBottom: bosluk.m,
    gap: 2,
    borderBottomLeftRadius: yaricap.l,
    borderBottomRightRadius: yaricap.l,
    ...golge("s"),
  },
  hataBasligi: { ...yazi.bolumBasligi, textAlign: "center" },
  hataMetni: { ...yazi.govde, textAlign: "center" },
  tekrarButonu: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.xxl,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: bosluk.s,
  },
});
