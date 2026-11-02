import { useEffect, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { AnaDugme, EkranBasligi, FormAlani, HataMetni } from "../src/bilesenler/Form";
import { kanitHazirla, sifreIleMi } from "../src/kimlik/kanit";
import { onayIste } from "../src/bilesenler/onay";

/**
 * Hesap güvenliği — web'deki "Şifre ve güvenlik" sayfasının mobil karşılığı.
 *
 * Üç ayrı iş, üç ayrı form:
 *   1. Şifre değiştirme — mevcut şifre + yeni şifre (iki kez), SMS yok.
 *   2. Kurtarma numarası — "şifremi unuttum"un çalışması buna bağlı.
 *   3. Hesabı silme — mağaza kuralı ve KVKK.
 *
 * Mobilde üçü de YOKTU. Numarası olmayan kullanıcı şifre kurtarmayı hiç
 * kullanamıyordu ve hesabını uygulamadan silemiyordu; ikincisi Apple ve
 * Google incelemesinde doğrudan red sebebi.
 */
export default function GuvenlikEkrani() {
  const router = useRouter();
  const guvenliAlan = useSafeAreaInsets();
  const oturumDurumu = useOturum((s) => s.durum);
  const cikisYap = useOturum((s) => s.cikisYap);

  const geri = () => (router.canGoBack() ? router.back() : router.replace("/profil"));

  if (oturumDurumu === "cikisli") {
    return (
      <View style={[stiller.kap, { paddingTop: guvenliAlan.top + bosluk.s }]}>
        <EkranBasligi baslik="Hesap güvenliği" onGeri={geri} />
        <View style={{ padding: bosluk.xl, gap: bosluk.m }}>
          <Text style={yazi.govde}>Bu sayfa için giriş yapmalısın.</Text>
          <AnaDugme metin="Giriş yap" onPress={() => router.replace("/giris")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={stiller.kap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
        <EkranBasligi baslik="Hesap güvenliği" onGeri={geri} />
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: bosluk.xl,
          paddingBottom: guvenliAlan.bottom + bosluk.xxxl,
          gap: bosluk.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SifreDegistir
          onDegisti={async () => {
            // Şifre değişince bu jeton da geçersiz; sessizce 401'e düşmek
            // yerine temiz bir çıkış.
            await cikisYap();
            Alert.alert("Şifren değişti", "Güvenlik için yeniden giriş yap.");
            router.replace("/giris");
          }}
        />
        <KurtarmaNumarasi />
        <HesabiSil
          onSilindi={async () => {
            await cikisYap();
            router.replace("/kesfet");
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: bosluk.m }}>
      <Text style={yazi.bolumBasligi}>{baslik}</Text>
      {children}
    </View>
  );
}

function SifreDegistir({ onDegisti }: { onDegisti: () => void }) {
  /**
   * Sosyal girişle açılan hesapta kullanıcı bir şifre BİLMİYOR: "mevcut
   * şifren" alanı ona dolduramayacağı bir kapı olurdu. Onun yerine
   * sağlayıcıyla doğrulanıyor ve bu ekran "şifre belirle"ye dönüşüyor
   * (bkz. src/kimlik/kanit.ts).
   */
  const kullanici = useOturum((st) => st.kullanici);
  const sifreli = sifreIleMi(kullanici);

  const [mevcut, setMevcut] = useState("");
  const [yeni, setYeni] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const uyusmazlik = tekrar.length > 0 && yeni !== tekrar;

  async function gonder() {
    setHata(null);
    if (yeni !== tekrar) return setHata("Şifreler birbiriyle uyuşmuyor.");
    setBekliyor(true);

    const kanit = await kanitHazirla(kullanici, mevcut);
    if (!kanit.ok) {
      setBekliyor(false);
      // İptal bir hata değil: kullanıcı doğrulamadan vazgeçtiyse ekranda
      // kırmızı bir satır bırakmıyoruz.
      return kanit.iptal ? undefined : setHata(kanit.hata);
    }

    const sonuc = await api.post("/api/app/sifre-degistir", {
      ...kanit.govde,
      yeniSifre: yeni,
      yeniSifreTekrar: tekrar,
    });
    setBekliyor(false);
    if (!sonuc.ok) return setHata(sonuc.hata);
    onDegisti();
  }

  return (
    <Bolum baslik={sifreli ? "Şifre değiştir" : "Şifre belirle"}>
      {sifreli ? (
        <FormAlani
          etiket="Mevcut şifren"
          value={mevcut}
          onChangeText={setMevcut}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          maxLength={128}
          editable={!bekliyor}
        />
      ) : (
        <Text style={yazi.kucuk}>
          Hesabını Apple ile açtığın için şifren yok. Şifre belirlerken kimliğini
          Apple ile bir kez daha doğrulayacağız.
        </Text>
      )}
      <FormAlani
        etiket="Yeni şifre"
        value={yeni}
        onChangeText={setYeni}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={128}
        ipucu="En az 8 karakter."
        editable={!bekliyor}
      />
      <FormAlani
        etiket="Yeni şifre (tekrar)"
        value={tekrar}
        onChangeText={setTekrar}
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
        metin={sifreli ? "Şifreyi değiştir" : "Şifreyi belirle"}
        bekleyenMetin={sifreli ? "Değiştiriliyor…" : "Belirleniyor…"}
        bekliyor={bekliyor}
        devreDisi={uyusmazlik || (sifreli && !mevcut) || !yeni}
        onPress={gonder}
      />
    </Bolum>
  );
}

/**
 * Kurtarma numarası — numara + mevcut şifre → SMS kodu → doğrulanmış kayıt.
 *
 * Mevcut şifre isteniyor: numarayı değiştirebilmek, şifreyi
 * değiştirebilmekle aynı güçte bir yetki (çalınmış oturum → numarayı değiştir
 * → "şifremi unuttum" → hesap gider).
 */
function KurtarmaNumarasi() {
  const kullanici = useOturum((st) => st.kullanici);
  const sifreli = sifreIleMi(kullanici);

  const [kayitli, setKayitli] = useState<string | null | undefined>(undefined);
  const [adim, setAdim] = useState<"numara" | "kod">("numara");
  const [duzenle, setDuzenle] = useState(false);
  const [telefon, setTelefon] = useState("");
  const [mevcut, setMevcut] = useState("");
  const [kod, setKod] = useState("");
  const [maskeli, setMaskeli] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    let iptal = false;
    void api.get<{ maskeli: string | null }>("/api/app/telefon").then((s) => {
      if (!iptal) setKayitli(s.ok ? s.veri.maskeli : null);
    });
    return () => {
      iptal = true;
    };
  }, []);

  async function kodIste() {
    setHata(null);
    setBekliyor(true);

    const kanit = await kanitHazirla(kullanici, mevcut);
    if (!kanit.ok) {
      setBekliyor(false);
      return kanit.iptal ? undefined : setHata(kanit.hata);
    }

    const sonuc = await api.post<{ maskeli: string }>("/api/app/telefon", {
      telefon,
      ...kanit.govde,
    });
    setBekliyor(false);
    if (!sonuc.ok) return setHata(sonuc.hata);
    setMaskeli(sonuc.veri.maskeli);
    setAdim("kod");
  }

  async function dogrula() {
    setHata(null);
    setBekliyor(true);
    const sonuc = await api.put<{ telefon: string }>("/api/app/telefon", { telefon, kod });
    setBekliyor(false);
    if (!sonuc.ok) return setHata(sonuc.hata);
    setKayitli(sonuc.veri.telefon);
    setAdim("numara");
    setDuzenle(false);
    setTelefon("");
    setMevcut("");
    setKod("");
  }

  if (kayitli === undefined) return null;

  const formGoster = !kayitli || duzenle;

  return (
    <Bolum baslik="Kurtarma numarası">
      {!formGoster ? (
        <>
          <Text style={yazi.govde}>
            Şifreni unutursan hesabını <Text style={{ color: renkler.metin.ana }}>{kayitli}</Text>{" "}
            numarasıyla geri alabilirsin.
          </Text>
          <Basilabilir
            onPress={() => setDuzenle(true)}
            style={stiller.metinBaglanti}
            accessibilityRole="button"
          >
            <Text style={stiller.baglantiMetni}>Numarayı değiştir</Text>
          </Basilabilir>
        </>
      ) : adim === "kod" ? (
        <>
          <Text style={yazi.govde}>{maskeli} numarasına 6 haneli kod gönderdik. 3 dakika geçerli.</Text>
          <FormAlani
            etiket="SMS kodu"
            value={kod}
            onChangeText={(d) => setKod(d.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            editable={!bekliyor}
          />
          <HataMetni mesaj={hata} />
          <AnaDugme
            metin="Numaramı doğrula"
            bekleyenMetin="Doğrulanıyor…"
            bekliyor={bekliyor}
            devreDisi={kod.length !== 6}
            onPress={dogrula}
          />
        </>
      ) : (
        <>
          {!kayitli ? (
            <Text style={yazi.govde}>
              Hesabında kurtarma numarası yok. Şifreni unutursan hesabını geri almanın başka yolu
              olmayacak.
            </Text>
          ) : null}
          <FormAlani
            etiket="Cep telefonun"
            value={telefon}
            onChangeText={setTelefon}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="0532 123 45 67"
            maxLength={20}
            ipucu="Yalnızca hesap kurtarma için kullanılır."
            editable={!bekliyor}
          />
          {sifreli ? (
            <FormAlani
              etiket="Mevcut şifren"
              value={mevcut}
              onChangeText={setMevcut}
              secureTextEntry
              autoComplete="current-password"
              maxLength={128}
              editable={!bekliyor}
            />
          ) : (
            <Text style={yazi.kucuk}>
              Numarayı kaydetmeden önce kimliğini Apple ile doğrulayacağız.
            </Text>
          )}
          <HataMetni mesaj={hata} />
          <AnaDugme
            metin="Kod gönder"
            bekleyenMetin="Gönderiliyor…"
            bekliyor={bekliyor}
            devreDisi={!telefon || (sifreli && !mevcut)}
            onPress={kodIste}
          />
        </>
      )}
    </Bolum>
  );
}

function HesabiSil({ onSilindi }: { onSilindi: () => void }) {
  const kullanici = useOturum((st) => st.kullanici);
  const sifreli = sifreIleMi(kullanici);

  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function onayla() {
    // Şifre alanına ek olarak sistem onayı: geri alınamayan tek işlem bu ve
    // mobilde yanlışlıkla dokunmak masaüstüne göre çok daha kolay.
    const onay = await onayIste(
      "Hesabın kalıcı olarak silinsin mi?",
      "Puanların, rozetlerin, ziyaret geçmişin ve favorilerin geri gelmez.",
      "Kalıcı olarak sil",
    );
    if (onay) await sil();
  }

  async function sil() {
    setHata(null);
    setBekliyor(true);

    /**
     * Sosyal hesapta kanıt sağlayıcıdan geliyor. Bu olmadan Apple ile
     * açılan hesap uygulamadan SİLİNEMİYORDU — mağaza kuralı (Apple
     * 5.1.1.v) bunu şart koşuyor.
     */
    const kanit = await kanitHazirla(kullanici, sifre);
    if (!kanit.ok) {
      setBekliyor(false);
      return kanit.iptal ? undefined : setHata(kanit.hata);
    }

    const sonuc = await api.delete("/api/app/hesap", kanit.govde);
    setBekliyor(false);
    if (!sonuc.ok) return setHata(sonuc.hata);
    onSilindi();
  }

  return (
    <Bolum baslik="Hesabı sil">
      <Text style={yazi.govde}>
        Puanların, rozetlerin, ziyaret geçmişin, favorilerin ve açtığın buluşmalar kalıcı olarak
        silinir. Bu işlem geri alınamaz.
      </Text>
      {!acik ? (
        <Basilabilir
          onPress={() => setAcik(true)}
          style={stiller.tehlikeCerceve}
          accessibilityRole="button"
        >
          <Text style={stiller.tehlikeMetni}>Hesabımı silmek istiyorum</Text>
        </Basilabilir>
      ) : (
        <>
          {sifreli ? (
            <FormAlani
              etiket="Onaylamak için şifreni yaz"
              value={sifre}
              onChangeText={setSifre}
              secureTextEntry
              autoComplete="current-password"
              maxLength={128}
              editable={!bekliyor}
            />
          ) : (
            <Text style={yazi.kucuk}>
              Silmeden önce kimliğini Apple ile doğrulayacağız.
            </Text>
          )}
          <HataMetni mesaj={hata} />
          <AnaDugme
            metin="Kalıcı olarak sil"
            bekleyenMetin="Siliniyor…"
            bekliyor={bekliyor}
            devreDisi={sifreli && !sifre}
            tehlikeli
            onPress={() => void onayla()}
          />
        </>
      )}
    </Bolum>
  );
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  metinBaglanti: { minHeight: 36, alignSelf: "flex-start", justifyContent: "center" },
  baglantiMetni: { ...yazi.govde, color: renkler.vurguParlak, fontWeight: "600" },
  tehlikeCerceve: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,74,0.45)",
  },
  tehlikeMetni: { ...yazi.govde, color: renkler.uyari, fontWeight: "600" },
});
