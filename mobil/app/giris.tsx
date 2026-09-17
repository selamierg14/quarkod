import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk } from "../src/tasarim";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { AnaDugme, FormAlani, HataMetni } from "../src/bilesenler/Form";

/**
 * Giriş ekranı.
 *
 * Eskiden bu ekranın ÇIKIŞI yoktu: hesabı olmayan kişi kayıt olamıyor,
 * şifresini unutan kurtaramıyordu. İki yol da sunucuda hazırdı; ekranda
 * bağlantıları eksikti.
 */
export default function GirisEkrani() {
  const router = useRouter();
  const guvenliAlan = useSafeAreaInsets();
  const girisYap = useOturum((s) => s.girisYap);

  const [username, setUsername] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder() {
    setHata(null);
    setGonderiliyor(true);
    const sonuc = await girisYap(username.trim(), sifre);
    setGonderiliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata ?? "Giriş yapılamadı.");
      return;
    }
    // Ekran derin bağlantıyla açıldıysa geri dönülecek yer yok.
    if (router.canGoBack()) router.back();
    else router.replace("/kesfet");
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
          gap: bosluk.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(420).springify()} style={{ gap: bosluk.xs }}>
          <Text style={yazi.ekranBasligi}>Tekrar hoş geldin</Text>
          <Text style={yazi.govde}>Şehrindeki mekanları keşfetmeye devam et.</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(420).springify()}
          style={{ gap: bosluk.m }}
        >
          <FormAlani
            etiket="Kullanıcı adı"
            value={username}
            onChangeText={setUsername}
            autoComplete="username"
            textContentType="username"
            maxLength={64}
          />
          <FormAlani
            etiket="Şifre"
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            maxLength={128}
            returnKeyType="go"
            onSubmitEditing={gonder}
          />

          {/* Şifre alanının hemen altında: şifresini hatırlamadığını
              anladığı an tam burası. */}
          <Basilabilir
            onPress={() => router.push("/sifremi-unuttum")}
            style={stiller.metinBaglanti}
            olcek={0.96}
            accessibilityRole="link"
          >
            <Text style={stiller.baglantiMetni}>Şifremi unuttum</Text>
          </Basilabilir>

          <HataMetni mesaj={hata} />

          <AnaDugme
            metin="Giriş yap"
            bekleyenMetin="Giriş yapılıyor…"
            bekliyor={gonderiliyor}
            devreDisi={!username.trim() || !sifre}
            onPress={gonder}
          />
        </Animated.View>

        <View style={stiller.altSatir}>
          <Text style={yazi.govde}>Hesabın yok mu?</Text>
          <Basilabilir
            onPress={() => router.replace("/kayit")}
            style={stiller.metinBaglanti}
            olcek={0.96}
            accessibilityRole="link"
          >
            <Text style={stiller.baglantiMetni}>Ücretsiz kaydol</Text>
          </Basilabilir>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stiller = StyleSheet.create({
  metinBaglanti: { minHeight: 36, alignSelf: "flex-start", justifyContent: "center" },
  baglantiMetni: { ...yazi.govde, color: renkler.vurguParlak, fontWeight: "600" },
  altSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.xs,
  },
});
