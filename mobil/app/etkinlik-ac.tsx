import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk, yaricap, isima } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { Cip } from "../src/bilesenler/Cip";
import { EkranBasligi } from "../src/bilesenler/Form";
import { tarihMetni } from "../src/ozellikler/etkinlik/EtkinlikKarti";

/**
 * Buluşma açma ekranı.
 *
 * MEKAN BURADA SEÇİLMİYOR, ekrana parametreyle geliyor: akış her zaman
 * bir mekan sayfasından başlıyor ("Burada buluşma aç"). 52 mekanlık bir
 * seçici koymak hem fazladan bir arama arayüzü demekti hem de kullanıcıyı
 * "nerede buluşalım" sorusunu formun içinde çözmeye zorluyordu — oysa o
 * karar zaten mekanı gezerken veriliyor.
 *
 * SAAT SEÇİMİ HAZIR SEÇENEKLERLE. Tarih seçici bileşeni iOS ve Android'de
 * farklı davranıyor ve buluşma çağrısının doğası zaten kabaca belli
 * ("bu akşam", "yarın akşam", "cumartesi"). Hazır seçenekler hem iki
 * platformda aynı görünüyor hem de formu tek dokunuşa indiriyor.
 */
export default function EtkinlikAcEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const girisli = useOturum((s) => s.durum === "girisli");
  const { mekanId, mekanAd } = useLocalSearchParams<{ mekanId: string; mekanAd: string }>();

  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [secilenSaat, setSecilenSaat] = useState<Date>(() => secenekler()[0].tarih);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const saatSecenekleri = secenekler();

  async function gonder() {
    setHata(null);
    if (baslik.trim().length < 4) {
      setHata("Başlık en az 4 karakter olmalı.");
      return;
    }
    setGonderiliyor(true);
    const sonuc = await api.post<{ id: string }>("/api/app/etkinlikler", {
      businessId: mekanId,
      baslik: baslik.trim(),
      aciklama: aciklama.trim(),
      baslangic: secilenSaat.toISOString(),
    });
    setGonderiliyor(false);

    if (!sonuc.ok) {
      // Sunucunun mesajı olduğu gibi gösteriliyor: rozet kapısı ve sayı
      // sınırı mesajları kullanıcıya ne yapması gerektiğini söylüyor
      // (bkz. lib/biyerlere/etkinlik.ts).
      setHata(sonuc.hata);
      return;
    }
    router.replace("/etkinlikler");
  }

  if (!girisli) {
    return (
      <View style={[stiller.kap, stiller.merkez, { paddingTop: guvenliAlan.top }]}>
        <Text style={yazi.bolumBasligi}>Buluşma açmak için giriş yap</Text>
        <Basilabilir
          style={[stiller.anaButon, isima(renkler.vurgu)]}
          onPress={() => router.replace("/giris")}
          titresim="orta"
        >
          <Text style={yazi.buton}>Giriş yap</Text>
        </Basilabilir>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={stiller.kap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
        <EkranBasligi baslik="Buluşma aç" onGeri={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: bosluk.xl,
          paddingBottom: guvenliAlan.bottom + bosluk.xxxl,
          gap: bosluk.l,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={yazi.govde}>
          <Text style={{ color: renkler.metin.ana }}>{mekanAd}</Text> için bir buluşma
          çağrısı açıyorsun. Gelenler &quot;ilgileniyorum&quot; işareti bırakır; katılım
          taahhüdü yok.
        </Text>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Başlık</Text>
          <TextInput
            value={baslik}
            onChangeText={setBaslik}
            placeholder="Cumartesi akşam kahvesi"
            placeholderTextColor={renkler.metin.soluk}
            maxLength={80}
            style={stiller.girdi}
            selectionColor={renkler.vurguParlak}
          />
        </View>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Açıklama (isteğe bağlı)</Text>
          <TextInput
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Bahçe tarafında olacağım, masayı ayırttım."
            placeholderTextColor={renkler.metin.soluk}
            maxLength={400}
            multiline
            style={[stiller.girdi, stiller.cokSatir]}
            selectionColor={renkler.vurguParlak}
          />
        </View>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Ne zaman</Text>
          <View style={stiller.saatIzgarasi}>
            {saatSecenekleri.map((secenek) => (
              <Cip
                key={secenek.tarih.toISOString()}
                metin={secenek.etiket}
                secili={secenek.tarih.getTime() === secilenSaat.getTime()}
                onPress={() => setSecilenSaat(secenek.tarih)}
              />
            ))}
          </View>
          <Text style={yazi.kucuk}>{tarihMetni(secilenSaat)}</Text>
        </View>

        {hata ? <Text style={stiller.hata}>{hata}</Text> : null}

        <Basilabilir
          style={[stiller.anaButon, isima(renkler.vurgu), gonderiliyor && { opacity: 0.6 }]}
          onPress={gonder}
          disabled={gonderiliyor}
          titresim="orta"
        >
          <Text style={yazi.buton}>{gonderiliyor ? "Açılıyor…" : "Buluşmayı aç"}</Text>
        </Basilabilir>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Hazır saat seçenekleri.
 *
 * Hepsi sunucunun alt sınırının (30 dakika) ötesinde: kullanıcıya
 * seçtirip sonra "çok yakın" diye reddetmek, formun kendi kuralını
 * bilmemesi olurdu.
 */
function secenekler(): { etiket: string; tarih: Date }[] {
  const simdi = new Date();
  const kur = (gunSonra: number, saat: number) => {
    const t = new Date(simdi);
    t.setDate(t.getDate() + gunSonra);
    t.setHours(saat, 0, 0, 0);
    return t;
  };

  const adaylar = [
    { etiket: "Bugün 20:00", tarih: kur(0, 20) },
    { etiket: "Bugün 22:00", tarih: kur(0, 22) },
    { etiket: "Yarın 12:00", tarih: kur(1, 12) },
    { etiket: "Yarın 20:00", tarih: kur(1, 20) },
    { etiket: "3 gün sonra 20:00", tarih: kur(3, 20) },
    { etiket: "Hafta sonu 20:00", tarih: haftaSonu(simdi) },
  ];

  // Geçmişte ya da çok yakında kalanlar eleniyor (sabahın 23:00'ünde
  // "bugün 20:00" seçeneği anlamsız).
  const enErken = simdi.getTime() + 45 * 60_000;
  const gecerli = adaylar.filter((a) => a.tarih.getTime() > enErken);
  return gecerli.length > 0 ? gecerli : [{ etiket: "Yarın 20:00", tarih: kur(1, 20) }];
}

/** Bir sonraki cumartesi 20:00. */
function haftaSonu(simdi: Date): Date {
  const t = new Date(simdi);
  const cumartesiyeKalan = (6 - t.getDay() + 7) % 7 || 7;
  t.setDate(t.getDate() + cumartesiyeKalan);
  t.setHours(20, 0, 0, 0);
  return t;
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  merkez: { alignItems: "center", justifyContent: "center", gap: bosluk.l, padding: bosluk.xl },
  girdi: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.m,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.m,
    minHeight: 52,
    // 16px altı yazı boyutu iOS'ta sayfayı otomatik yakınlaştırıyor.
    fontSize: 16,
    color: renkler.metin.ana,
  },
  cokSatir: { minHeight: 96, textAlignVertical: "top" },
  saatIzgarasi: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.s },
  hata: { ...yazi.kucuk, color: renkler.uyari },
  anaButon: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});
