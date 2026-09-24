import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk } from "../src/tasarim";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { AnaDugme, FormAlani, HataMetni } from "../src/bilesenler/Form";
import { SosyalGirisDugmeleri } from "../src/bilesenler/SosyalGirisDugmeleri";

/**
 * Kayıt ekranı.
 *
 * UYGULAMADA HİÇ YOKTU: store'da `kayitOl` fonksiyonu yazılmıştı ama hiçbir
 * ekrandan çağrılmıyordu, `/kayit` açılınca Expo'nun "Unmatched Route"
 * sayfası geliyordu. Yani uygulamayı indiren yeni bir kişi hesap
 * açamıyordu — mağazaya çıkmış bir uygulama için en temel eksik.
 *
 * `?ref=KOD` ile açılırsa davet kodu önceden dolu: arkadaşının paylaştığı
 * bağlantıya dokunan kişi kodu elle yazmak zorunda kalmıyor.
 *
 * Kurallar İSTEMCİDE ÖN KONTROL, sunucuda kesin: şifre uzunluğu ve
 * kullanıcı adı biçimi burada gönderilmeden söyleniyor (gereksiz ağ turu
 * ve bekleme yok), ama asıl doğrulama /api/app/kayit'te.
 */

const KULLANICI_ADI_DESENI = /^[a-z0-9._-]{3,32}$/;

export default function KayitEkrani() {
  const router = useRouter();
  const guvenliAlan = useSafeAreaInsets();
  const kayitOl = useOturum((s) => s.kayitOl);
  const { ref } = useLocalSearchParams<{ ref?: string }>();

  const [ad, setAd] = useState("");
  const [username, setUsername] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreTekrar, setSifreTekrar] = useState("");
  const [davetKodu, setDavetKodu] = useState(ref?.toUpperCase() ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const uyusmazlik = sifreTekrar.length > 0 && sifre !== sifreTekrar;
  const adBicimiHatali = username.length > 0 && !KULLANICI_ADI_DESENI.test(username);

  async function gonder() {
    setHata(null);
    if (!ad.trim()) return setHata("Adını yaz.");
    if (!KULLANICI_ADI_DESENI.test(username)) {
      return setHata("Kullanıcı adı 3-32 karakter; harf, rakam, nokta, tire ve alt çizgi.");
    }
    if (sifre.length < 8) return setHata("Şifre en az 8 karakter olmalı.");
    if (/^\d+$/.test(sifre)) return setHata("Şifre sadece rakamlardan oluşmasın.");
    if (sifre !== sifreTekrar) return setHata("Şifreler birbiriyle uyuşmuyor.");

    setGonderiliyor(true);
    const sonuc = await kayitOl(ad.trim(), username, sifre, davetKodu.trim() || undefined);
    setGonderiliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata ?? "Kayıt oluşturulamadı.");
      return;
    }
    router.replace("/kesfet");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: renkler.zemin }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: bosluk.xl,
          paddingTop: guvenliAlan.top + bosluk.xxl,
          paddingBottom: guvenliAlan.bottom + bosluk.xxl,
          gap: bosluk.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(420).springify()} style={{ gap: bosluk.xs }}>
          <Text style={yazi.ekranBasligi}>Biyerlere&apos;ye katıl</Text>
          <Text style={yazi.govde}>Ücretsiz kaydol, puan biriktir, rozet kazan.</Text>
        </Animated.View>

        <View style={{ gap: bosluk.m }}>
          <FormAlani
            etiket="Adın"
            value={ad}
            onChangeText={setAd}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={80}
          />
          <FormAlani
            etiket="Kullanıcı adı"
            value={username}
            // Sunucu küçük harfe çeviriyor; kullanıcı yazarken görsün.
            onChangeText={(d) => setUsername(d.toLowerCase().trim())}
            autoComplete="username-new"
            textContentType="username"
            maxLength={32}
            hataVar={adBicimiHatali}
            ipucu={
              adBicimiHatali
                ? "Harf, rakam, nokta, tire ve alt çizgi; en az 3 karakter."
                : undefined
            }
          />
          <FormAlani
            etiket="Şifre"
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            ipucu="En az 8 karakter."
          />
          <FormAlani
            etiket="Şifre (tekrar)"
            value={sifreTekrar}
            onChangeText={setSifreTekrar}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            hataVar={uyusmazlik}
            ipucu={uyusmazlik ? "İki şifre birbiriyle uyuşmuyor." : undefined}
          />
          <FormAlani
            etiket="Davet kodu (isteğe bağlı)"
            value={davetKodu}
            onChangeText={(d) => setDavetKodu(d.toUpperCase())}
            autoCapitalize="characters"
            maxLength={16}
            placeholder="Bir arkadaşın davet etti mi?"
          />

          <HataMetni mesaj={hata} />

          <AnaDugme
            metin="Ücretsiz kaydol"
            bekleyenMetin="Kaydolunuyor…"
            bekliyor={gonderiliyor}
            devreDisi={uyusmazlik}
            onPress={gonder}
          />

          <SosyalGirisDugmeleri onBasarili={() => router.replace("/kesfet")} />
        </View>

        <View style={stiller.altSatir}>
          <Text style={yazi.govde}>Zaten hesabın var mı?</Text>
          <Basilabilir
            onPress={() => router.replace("/giris")}
            style={stiller.metinBaglanti}
            olcek={0.96}
            accessibilityRole="link"
          >
            <Text style={stiller.baglantiMetni}>Giriş yap</Text>
          </Basilabilir>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stiller = StyleSheet.create({
  metinBaglanti: { minHeight: 36, justifyContent: "center" },
  baglantiMetni: { ...yazi.govde, color: renkler.vurguParlak, fontWeight: "600" },
  altSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.xs,
  },
});
