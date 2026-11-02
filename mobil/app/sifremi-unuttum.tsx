import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { AnaDugme, EkranBasligi, FormAlani, HataMetni } from "../src/bilesenler/Form";

/**
 * "Şifremi unuttum" — web'deki akışın aynısı, aynı uçlar:
 *
 *   kimlik → kullanıcı adı            POST  /api/app/sifre-kurtar
 *   kod    → SMS kodu (yalnız kod)    PUT   → kısa ömürlü bilet
 *   sifre  → yeni şifre, iki kez      PATCH → bilet + şifre
 *   bitti
 *
 * İKİNCİ ADIMA HER DURUMDA GEÇİLİYOR ve numara gösterilmiyor: sunucu
 * "böyle bir kullanıcı yok" ile "kod gönderildi"yi bilerek ayırt etmiyor,
 * arayüz de etmemeli. Aksi halde bu ekran kullanıcı adı sorgulama aracına
 * dönerdi.
 */

type Adim = "kimlik" | "kod" | "sifre" | "bitti";

export default function SifremiUnuttumEkrani() {
  const router = useRouter();
  const guvenliAlan = useSafeAreaInsets();

  const [adim, setAdim] = useState<Adim>("kimlik");
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [kod, setKod] = useState("");
  const [bilet, setBilet] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const uyusmazlik = yeniSifreTekrar.length > 0 && yeniSifre !== yeniSifreTekrar;

  async function kodIste() {
    setHata(null);
    setBekliyor(true);
    const sonuc = await api.acikPost("/api/app/sifre-kurtar", {
      kullaniciAdi: kullaniciAdi.trim().toLowerCase(),
    });
    setBekliyor(false);
    // Yalnızca hız sınırı ve biçim hatası gösteriliyor; geri kalan her
    // durumda ikinci adıma geçiliyor.
    if (!sonuc.ok) return setHata(sonuc.hata);
    setAdim("kod");
  }

  async function kodDogrula() {
    setHata(null);
    setBekliyor(true);
    const sonuc = await api.acikPut<{ bilet: string }>("/api/app/sifre-kurtar", {
      kullaniciAdi: kullaniciAdi.trim().toLowerCase(),
      kod,
    });
    setBekliyor(false);
    if (!sonuc.ok) return setHata(sonuc.hata);
    setBilet(sonuc.veri.bilet);
    setAdim("sifre");
  }

  async function sifreyiYaz() {
    setHata(null);
    if (yeniSifre !== yeniSifreTekrar) return setHata("Şifreler birbiriyle uyuşmuyor.");
    setBekliyor(true);
    const sonuc = await api.acikPatch("/api/app/sifre-kurtar", {
      bilet,
      yeniSifre,
      yeniSifreTekrar,
    });
    setBekliyor(false);
    if (!sonuc.ok) return setHata(sonuc.hata);
    setAdim("bitti");
  }

  const geri = () => {
    // Kod adımından geri: kullanıcı adını düzeltmek için ilk adıma.
    if (adim === "kod") {
      setAdim("kimlik");
      setKod("");
      setHata(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/giris");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: renkler.zemin }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
        <EkranBasligi baslik="Şifreni sıfırla" onGeri={geri} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: bosluk.xl,
          paddingBottom: guvenliAlan.bottom + bosluk.xxl,
          gap: bosluk.m,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {adim === "kimlik" ? (
          <>
            <Text style={yazi.govde}>
              Kullanıcı adını yaz; hesabına kayıtlı numaraya bir kod gönderelim.
            </Text>
            <FormAlani
              etiket="Kullanıcı adı"
              value={kullaniciAdi}
              onChangeText={setKullaniciAdi}
              autoComplete="username"
              maxLength={64}
              editable={!bekliyor}
            />
            <HataMetni mesaj={hata} />
            <AnaDugme
              metin="Kod gönder"
              bekleyenMetin="Gönderiliyor…"
              bekliyor={bekliyor}
              devreDisi={!kullaniciAdi.trim()}
              onPress={kodIste}
            />
          </>
        ) : null}

        {adim === "kod" ? (
          <>
            <Text style={yazi.govde}>
              Kullanıcı adına kayıtlı doğrulanmış bir numara varsa 6 haneli kodu o numaraya
              gönderdik. Kod 3 dakika geçerli.
            </Text>
            <FormAlani
              etiket="SMS kodu"
              value={kod}
              onChangeText={(d) => setKod(d.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              placeholder="000000"
              maxLength={6}
              editable={!bekliyor}
            />
            <HataMetni mesaj={hata} />
            <AnaDugme
              metin="Kodu doğrula"
              bekleyenMetin="Doğrulanıyor…"
              bekliyor={bekliyor}
              devreDisi={kod.length !== 6}
              onPress={kodDogrula}
            />
            <Text style={[yazi.kucuk, { textAlign: "center" }]}>
              Kod gelmediyse hesabında doğrulanmış bir numara olmayabilir.
            </Text>
          </>
        ) : null}

        {adim === "sifre" ? (
          <>
            <Text style={yazi.govde}>Kodun doğrulandı. Yeni şifreni iki kez yaz.</Text>
            <FormAlani
              etiket="Yeni şifre"
              value={yeniSifre}
              onChangeText={setYeniSifre}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              ipucu="En az 8 karakter."
              editable={!bekliyor}
            />
            <FormAlani
              etiket="Yeni şifre (tekrar)"
              value={yeniSifreTekrar}
              onChangeText={setYeniSifreTekrar}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              hataVar={uyusmazlik}
              ipucu={uyusmazlik ? "İki şifre birbiriyle uyuşmuyor." : undefined}
              editable={!bekliyor}
            />
            <HataMetni mesaj={hata} />
            <AnaDugme
              metin="Şifremi kaydet"
              bekleyenMetin="Kaydediliyor…"
              bekliyor={bekliyor}
              devreDisi={uyusmazlik || !yeniSifre}
              onPress={sifreyiYaz}
            />
          </>
        ) : null}

        {adim === "bitti" ? (
          <>
            <Text style={yazi.bolumBasligi}>Şifren değişti ✓</Text>
            <Text style={yazi.govde}>
              Yeni şifrenle giriş yapabilirsin. Açık kalmış diğer oturumların güvenlik için
              kapatıldı.
            </Text>
            <AnaDugme metin="Giriş yap" onPress={() => router.replace("/giris")} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
