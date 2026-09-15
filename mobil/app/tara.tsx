import { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, isima } from "../src/tasarim";
import { api } from "../src/api/istemci";
import type { ZiyaretYaniti } from "../src/api/tipler";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { qrCoz } from "../src/ozellikler/tara/qrCoz";
import { Nisangah, PENCERE } from "../src/ozellikler/tara/Nisangah";
import { OdulSayfasi } from "../src/ozellikler/tara/OdulSayfasi";

type Durum =
  | { ad: "tariyor" }
  | { ad: "gonderiyor" }
  | { ad: "basarili"; sonuc: ZiyaretYaniti }
  | { ad: "hatali"; mesaj: string; yenidenDenenebilir: boolean };

/**
 * Masadaki karekodu okutma ekranı.
 *
 * Doğrulanmış ziyaret uygulamanın çekirdek eylemi — puan, rozet, sadakat
 * damgası ve kupon yalnızca buradan geliyor. Sunucu ucu (/api/app/ziyaret)
 * en baştan bu akış için yazılmıştı ama uygulamada onu tetikleyen hiçbir
 * yer yoktu: kullanıcı karekodu telefonun kamerasıyla okuyup tarayıcıya
 * düşüyor ve puanını hiç alamıyordu.
 *
 * Doğrulama iki ayaklı ve ikisi de burada toplanıyor: fiziksel karekod
 * (uzaktan tahmin edilemez) + GPS mesafesi. Konum izni tam da burada
 * isteniyor — Keşfet'i açmak izin istemek için gerekçe değil, ama "bu
 * ziyareti doğrula" demek tam olarak öyle bir gerekçe.
 */
export default function TaraEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const oturum = useOturum();
  const [izin, izinIste] = useCameraPermissions();

  const [durum, setDurum] = useState<Durum>({ ad: "tariyor" });
  const [fener, setFener] = useState(false);
  // Kamera saniyede onlarca kare için geri çağırıyor; ilk okumadan sonra
  // kilitlenmezse aynı karekod için art arda istek gidiyor.
  const kilit = useRef(false);

  const kapat = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/kesfet");
  }, [router]);

  const yenidenDene = useCallback(() => {
    kilit.current = false;
    setDurum({ ad: "tariyor" });
  }, []);

  const okundu = useCallback(
    async ({ data }: { data: string }) => {
      if (kilit.current) return;

      const hedef = qrCoz(data);
      if (!hedef) {
        kilit.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setDurum({
          ad: "hatali",
          mesaj: "Bu karekod Biyerlere'ye ait değil. Masadaki karekodu okuttuğundan emin ol.",
          yenidenDenenebilir: true,
        });
        return;
      }

      kilit.current = true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDurum({ ad: "gonderiyor" });

      // Konum ziyaretin ikinci ayağı; izin verilmezse sunucu zaten
      // reddediyor, o yüzden burada net bir mesajla duruyoruz.
      let konum: { enlem: number; boylam: number } | null = null;
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (granted) {
          const nokta = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          konum = { enlem: nokta.coords.latitude, boylam: nokta.coords.longitude };
        }
      } catch {
        // Konum alınamadı; aşağıdaki kontrol devreye giriyor.
      }

      if (!konum) {
        setDurum({
          ad: "hatali",
          mesaj:
            "Ziyaretini doğrulamak için konum izni gerekiyor — mekanda olduğunu böyle anlıyoruz.",
          yenidenDenenebilir: true,
        });
        return;
      }

      const sonuc = await api.post<ZiyaretYaniti>("/api/app/ziyaret", {
        slug: hedef.slug,
        masa: hedef.masa ?? "",
        enlem: konum.enlem,
        boylam: konum.boylam,
      });

      if (sonuc.ok) {
        setDurum({ ad: "basarili", sonuc: sonuc.veri });
        // Puan başka ekranlarda da okunuyor (Keşfet'teki çip, Profil).
        void oturum.yenile();
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setDurum({ ad: "hatali", mesaj: sonuc.hata, yenidenDenenebilir: true });
    },
    [oturum],
  );

  if (oturum.durum === "cikisli") {
    return (
      <Bilgi
        ustBosluk={guvenliAlan.top}
        simge="🔐"
        baslik="Önce giriş yap"
        aciklama="Ziyaretlerin ve puanların hesabına işlensin diye karekod okutmak giriş gerektiriyor."
        butonMetni="Giriş yap"
        onButon={() => router.replace("/giris")}
        onKapat={kapat}
      />
    );
  }

  if (Platform.OS === "web") {
    // Web önizlemesinde kamera akışı çalışsa bile bu ekranın hedefi
    // telefondaki fiziksel karekod; kullanıcıyı boş bir kameraya
    // bakmakla oyalamak yerine durumu söylüyoruz.
    return (
      <Bilgi
        ustBosluk={guvenliAlan.top}
        simge="📱"
        baslik="Karekod okutma telefonda"
        aciklama="Bu ekran masadaki fiziksel karekodu okutmak için; uygulamayı telefonunda aç."
        onKapat={kapat}
      />
    );
  }

  if (!izin) {
    return (
      <View style={stiller.merkez}>
        <ActivityIndicator color={renkler.vurguParlak} />
      </View>
    );
  }

  if (!izin.granted) {
    return (
      <Bilgi
        ustBosluk={guvenliAlan.top}
        simge="📷"
        baslik="Kamera izni gerekiyor"
        aciklama="Masadaki karekodu okutabilmek için kameraya erişmemiz gerekiyor. Fotoğraf çekmiyor, kaydetmiyoruz."
        butonMetni={izin.canAskAgain ? "İzin ver" : "Ayarları aç"}
        onButon={() => void izinIste()}
        onKapat={kapat}
      />
    );
  }

  if (durum.ad === "basarili") {
    return (
      <OdulSayfasi
        sonuc={durum.sonuc}
        onKapat={kapat}
        onCuzdan={() => router.replace("/cuzdan")}
      />
    );
  }

  return (
    <View style={stiller.kap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={fener}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={durum.ad === "tariyor" ? okundu : undefined}
      />

      {/* Karartma: pencere dışında kalan dört dikdörtgen. */}
      <Karartma />
      <Nisangah />

      <View style={[stiller.ustCubuk, { paddingTop: guvenliAlan.top + bosluk.s }]}>
        <Basilabilir style={stiller.yuvarlakDugme} onPress={kapat} accessibilityLabel="Kapat">
          <Text style={stiller.dugmeSimgesi}>✕</Text>
        </Basilabilir>
        <Basilabilir
          style={[stiller.yuvarlakDugme, fener && stiller.dugmeAktif]}
          onPress={() => setFener((f) => !f)}
          accessibilityLabel={fener ? "Feneri kapat" : "Feneri aç"}
        >
          <Text style={stiller.dugmeSimgesi}>{fener ? "🔦" : "💡"}</Text>
        </Basilabilir>
      </View>

      <View style={[stiller.altPanel, { paddingBottom: guvenliAlan.bottom + bosluk.xl }]}>
        {durum.ad === "gonderiyor" ? (
          <Animated.View entering={FadeIn.duration(200)} style={stiller.durumKutusu}>
            <ActivityIndicator color={renkler.vurguParlak} />
            <Text style={yazi.govde}>Ziyaretin doğrulanıyor…</Text>
          </Animated.View>
        ) : durum.ad === "hatali" ? (
          <Animated.View entering={FadeIn.duration(220)} style={stiller.durumKutusu}>
            <Text style={stiller.hataMetni}>{durum.mesaj}</Text>
            {durum.yenidenDenenebilir ? (
              <Basilabilir style={stiller.birincilButon} onPress={yenidenDene} titresim="orta">
                <Text style={yazi.buton}>Tekrar dene</Text>
              </Basilabilir>
            ) : null}
          </Animated.View>
        ) : (
          <View style={stiller.ipucu}>
            <Text style={stiller.ipucuBasligi}>Masadaki karekodu okut</Text>
            <Text style={yazi.kucuk}>
              Ziyaretin doğrulansın, puan ve sadakat damgan hesabına işlensin.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Pencere dışını karartan dört dikdörtgen (maske yerine — bkz. Nisangah). */
function Karartma() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={stiller.perde} />
      <View style={stiller.ortaSatir}>
        <View style={stiller.perde} />
        <View style={{ width: PENCERE, height: PENCERE }} />
        <View style={stiller.perde} />
      </View>
      <View style={stiller.perde} />
    </View>
  );
}

function Bilgi({
  ustBosluk,
  simge,
  baslik,
  aciklama,
  butonMetni,
  onButon,
  onKapat,
}: {
  ustBosluk: number;
  simge: string;
  baslik: string;
  aciklama: string;
  butonMetni?: string;
  onButon?: () => void;
  onKapat: () => void;
}) {
  return (
    <View style={[stiller.merkez, { paddingTop: ustBosluk + bosluk.xxl }]}>
      <Text style={{ fontSize: 44 }}>{simge}</Text>
      <Text style={[yazi.bolumBasligi, { textAlign: "center" }]}>{baslik}</Text>
      <Text style={[yazi.govde, { textAlign: "center", maxWidth: 300 }]}>{aciklama}</Text>
      <View style={{ width: "100%", gap: bosluk.s, maxWidth: 340 }}>
        {butonMetni && onButon ? (
          <Basilabilir
            style={[stiller.birincilButon, isima(renkler.vurgu)]}
            onPress={onButon}
            titresim="orta"
          >
            <Text style={yazi.buton}>{butonMetni}</Text>
          </Basilabilir>
        ) : null}
        <Basilabilir style={stiller.ikincilButon} onPress={onKapat}>
          <Text style={yazi.buton}>Kapat</Text>
        </Basilabilir>
      </View>
    </View>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: "#000000" },
  merkez: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.l,
    padding: bosluk.xl,
    backgroundColor: renkler.zemin,
  },
  perde: { flex: 1, backgroundColor: "rgba(10,10,12,0.78)" },
  ortaSatir: { flexDirection: "row", height: PENCERE },
  ustCubuk: {
    position: "absolute",
    top: 0,
    left: bosluk.l,
    right: bosluk.l,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yuvarlakDugme: {
    width: 42,
    height: 42,
    minHeight: 42,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26,26,30,0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
  },
  dugmeAktif: { backgroundColor: renkler.vurgu },
  dugmeSimgesi: { fontSize: 17, color: renkler.metin.ana },
  altPanel: {
    position: "absolute",
    left: bosluk.l,
    right: bosluk.l,
    bottom: 0,
  },
  ipucu: { alignItems: "center", gap: 4 },
  ipucuBasligi: { ...yazi.bolumBasligi, fontSize: 17, textAlign: "center" },
  durumKutusu: {
    alignItems: "center",
    gap: bosluk.m,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.camKoyu,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
  },
  hataMetni: { ...yazi.govde, color: renkler.metin.ana, textAlign: "center" },
  birincilButon: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 50,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  ikincilButon: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.m,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgiBelirgin,
  },
});
