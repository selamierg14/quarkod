import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, isima } from "../src/tasarim";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";

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
    router.back();
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
          <Alan
            etiket="Kullanıcı adı"
            deger={username}
            onDegis={setUsername}
            otomatikTamamla="username"
          />
          <Alan
            etiket="Şifre"
            deger={sifre}
            onDegis={setSifre}
            gizli
            otomatikTamamla="current-password"
          />

          {hata ? <Text style={stiller.hata}>{hata}</Text> : null}

          <Basilabilir
            style={[stiller.buton, isima(renkler.vurgu), gonderiliyor && { opacity: 0.6 }]}
            onPress={gonder}
            disabled={gonderiliyor}
            titresim="orta"
          >
            <Text style={yazi.buton}>{gonderiliyor ? "Giriş yapılıyor…" : "Giriş yap"}</Text>
          </Basilabilir>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Alan({
  etiket,
  deger,
  onDegis,
  gizli,
  otomatikTamamla,
}: {
  etiket: string;
  deger: string;
  onDegis: (d: string) => void;
  gizli?: boolean;
  otomatikTamamla?: "username" | "current-password";
}) {
  const [odakli, setOdakli] = useState(false);

  return (
    <View style={{ gap: bosluk.s }}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <TextInput
        value={deger}
        onChangeText={onDegis}
        secureTextEntry={gizli}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={otomatikTamamla}
        onFocus={() => setOdakli(true)}
        onBlur={() => setOdakli(false)}
        // 16px altı yazı boyutu iOS'ta sayfayı otomatik yakınlaştırıyor.
        style={[stiller.girdi, odakli && { borderColor: renkler.vurgu }]}
        placeholderTextColor={renkler.metin.soluk}
      />
    </View>
  );
}

const stiller = StyleSheet.create({
  girdi: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.m,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: bosluk.l,
    minHeight: 52,
    fontSize: 16,
    color: renkler.metin.ana,
  },
  buton: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: bosluk.s,
  },
  hata: { ...yazi.kucuk, color: renkler.uyari },
});
