import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { renkler, yazi, bosluk, yaricap, isima } from "../src/tasarim";
import { api } from "../src/api/istemci";
import { useVeri } from "../src/api/useVeri";
import { useOturum } from "../src/store/oturum";
import { Basilabilir } from "../src/bilesenler/Basilabilir";
import { Cip } from "../src/bilesenler/Cip";
import { EkranBasligi, HataMetni } from "../src/bilesenler/Form";
import type { MusaitlikYaniti } from "../src/api/tipler";

/**
 * MASA AYIRTMA.
 *
 * Üç soru soruluyor — kaç kişi, hangi gün, saat kaç — ve hepsi tek
 * ekranda, dokunarak cevaplanıyor. Masa numarası SORULMUYOR: müşteri
 * mekanın kat planını bilmiyor, masayı sunucu seçiyor (bkz.
 * lib/biyerlere/rezervasyon-talebi.ts).
 *
 * SAATLER SUNUCUDAN GELİYOR, burada üretilmiyor. Müsaitlik üç şeye
 * bağlı: mekanın çalışma saatleri, o saatte boş masa kalıp kalmadığı ve
 * grubun kaç kişi olduğu. Bunların hiçbirini telefon bilemez; üretip
 * sonra "dolu" cevabı almak, kullanıcıya olmayan bir seçim sunmaktır.
 *
 * Kişi sayısı ya da gün değiştiğinde liste yeniden isteniyor — sorgu
 * adresinin kendisi (`useVeri`'nin anahtarı) bu üçlüyü taşıyor.
 */
export default function RezervasyonEkrani() {
  const guvenliAlan = useSafeAreaInsets();
  const router = useRouter();
  const girisli = useOturum((s) => s.durum === "girisli");
  const { slug, mekanAd } = useLocalSearchParams<{ slug: string; mekanAd?: string }>();

  const [kisi, setKisi] = useState(2);
  const [gunIndeksi, setGunIndeksi] = useState(0);
  const [secilenSaat, setSecilenSaat] = useState<string | null>(null);
  const [not, setNot] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  const gunler = useMemo(() => gunSeridi(), []);
  const gun = gunler[gunIndeksi];

  const { veri, yenileniyor } = useVeri<MusaitlikYaniti>(
    `/api/app/rezervasyon?mekan=${encodeURIComponent(slug ?? "")}&tarih=${gun.anahtar}&kisi=${kisi}`,
    { jetonlu: true, etkin: girisli && Boolean(slug) },
  );

  async function gonder() {
    if (!secilenSaat) {
      setHata("Bir saat seç.");
      return;
    }
    setHata(null);
    setGonderiliyor(true);
    const yanit = await api.post<{ durumMetni: string }>("/api/app/rezervasyon", {
      mekanSlug: slug,
      baslangic: secilenSaat,
      kisiSayisi: kisi,
      not: not.trim(),
    });
    setGonderiliyor(false);

    if (!yanit.ok) {
      // Sunucunun mesajı olduğu gibi gösteriliyor: "bu saat az önce
      // doldu", "en fazla 3 açık rezervasyon" gibi cevaplar kullanıcıya
      // ne yapacağını da söylüyor.
      setHata(yanit.hata);
      return;
    }
    setSonuc(yanit.veri.durumMetni);
  }

  if (!girisli) {
    return (
      <View style={[stiller.kap, stiller.merkez, { paddingTop: guvenliAlan.top }]}>
        <Text style={yazi.bolumBasligi}>Masa ayırtmak için giriş yap</Text>
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

  /** Talep gönderildi — ekran tek bir mesaja dönüşüyor. */
  if (sonuc) {
    return (
      <View style={stiller.kap}>
        <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
          <EkranBasligi baslik="Rezervasyon" onGeri={() => router.back()} />
        </View>
        <View style={[stiller.merkez, { flex: 1 }]}>
          <Text style={stiller.onayBasligi}>Talebin iletildi</Text>
          <Text style={[yazi.govde, { textAlign: "center" }]}>
            {mekanAd ?? "Mekan"} onayladığında haber vereceğiz. Durumu
            &quot;Rezervasyonlarım&quot; ekranından takip edebilirsin.
          </Text>
          <Basilabilir
            style={[stiller.anaButon, isima(renkler.vurgu)]}
            onPress={() => router.replace("/rezervasyonlarim")}
            titresim="orta"
          >
            <Text style={yazi.buton}>Rezervasyonlarım</Text>
          </Basilabilir>
        </View>
      </View>
    );
  }

  const saatler = veri?.saatler ?? [];

  return (
    <KeyboardAvoidingView
      style={stiller.kap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: guvenliAlan.top + bosluk.s }}>
        <EkranBasligi baslik="Masa ayırt" onGeri={() => router.back()} />
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
          <Text style={{ color: renkler.metin.ana }}>{veri?.mekan.ad ?? mekanAd}</Text> için
          yer ayırtıyorsun. Talebin mekanın onayına düşecek; adın ve varsa doğrulanmış
          numaran mekanla paylaşılır.
        </Text>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Kaç kişi</Text>
          <View style={stiller.izgara}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((sayi) => (
              <Cip
                key={sayi}
                metin={`${sayi}`}
                secili={sayi === kisi}
                onPress={() => {
                  setKisi(sayi);
                  setSecilenSaat(null);
                }}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Hangi gün</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[stiller.izgara, { flexWrap: "nowrap" }]}>
              {gunler.map((g, i) => (
                <Cip
                  key={g.anahtar}
                  metin={g.etiket}
                  secili={i === gunIndeksi}
                  onPress={() => {
                    setGunIndeksi(i);
                    setSecilenSaat(null);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Saat</Text>
          {yenileniyor && saatler.length === 0 ? (
            <ActivityIndicator color={renkler.vurgu} />
          ) : saatler.length === 0 ? (
            <View style={{ gap: bosluk.s }}>
              <Text style={yazi.kucuk}>
                Bu gün için uygun saat yok. Başka bir gün seçebilir ya da grubu
                küçültebilirsin.
              </Text>
              {veri?.mekan.telefon ? (
                <Basilabilir
                  style={stiller.ikincilButon}
                  onPress={() => void Linking.openURL(`tel:${veri.mekan.telefon}`)}
                  titresim="hafif"
                >
                  <Text style={stiller.ikincilMetin}>Mekanı ara</Text>
                </Basilabilir>
              ) : null}
            </View>
          ) : (
            <View style={stiller.izgara}>
              {saatler.map((s) => (
                <Cip
                  key={s.baslangic}
                  metin={s.etiket}
                  secili={s.baslangic === secilenSaat}
                  onPress={() => setSecilenSaat(s.baslangic)}
                />
              ))}
            </View>
          )}
          {veri ? (
            <Text style={yazi.kucuk}>
              Masa yaklaşık {Math.round(veri.sureDakika / 60)} saat için ayrılır.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: bosluk.s }}>
          <Text style={yazi.etiket}>Not (isteğe bağlı)</Text>
          <TextInput
            value={not}
            onChangeText={setNot}
            placeholder="Doğum günü kutlaması, bahçe tarafı olursa seviniriz."
            placeholderTextColor={renkler.metin.soluk}
            maxLength={300}
            multiline
            style={[stiller.girdi, stiller.cokSatir]}
            selectionColor={renkler.vurguParlak}
          />
        </View>

        <HataMetni mesaj={hata} />

        <Basilabilir
          style={[
            stiller.anaButon,
            isima(renkler.vurgu),
            (gonderiliyor || !secilenSaat) && { opacity: 0.6 },
          ]}
          onPress={gonder}
          disabled={gonderiliyor || !secilenSaat}
          titresim="orta"
        >
          <Text style={yazi.buton}>
            {gonderiliyor ? "Gönderiliyor…" : "Rezervasyon iste"}
          </Text>
        </Basilabilir>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Önümüzdeki 14 günün şeridi.
 *
 * Sunucu 30 güne izin veriyor ama şeritte 30 çip kaydırmak, "bu hafta
 * sonu" arayan kullanıcı için gürültü. Daha uzağı isteyen nadir ve o
 * kullanıcı zaten mekanı arıyor.
 */
function gunSeridi(): { anahtar: string; etiket: string }[] {
  const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const bugun = new Date();
  const p = (n: number) => String(n).padStart(2, "0");

  return Array.from({ length: 14 }, (_, i) => {
    const t = new Date(bugun);
    t.setDate(t.getDate() + i);
    const anahtar = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
    const etiket =
      i === 0
        ? "Bugün"
        : i === 1
          ? "Yarın"
          : `${gunAdlari[t.getDay()]} ${t.getDate()}`;
    return { anahtar, etiket };
  });
}

const stiller = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renkler.zemin },
  merkez: {
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.l,
    padding: bosluk.xl,
  },
  onayBasligi: { ...yazi.bolumBasligi, fontSize: 22 },
  izgara: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.s },
  girdi: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.m,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.m,
    minHeight: 52,
    fontSize: 16,
    color: renkler.metin.ana,
  },
  cokSatir: { minHeight: 88, textAlignVertical: "top" },
  anaButon: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: bosluk.xl,
  },
  ikincilButon: {
    borderRadius: yaricap.m,
    borderWidth: 1,
    borderColor: renkler.cizgi,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  ikincilMetin: { ...yazi.govde, color: renkler.metin.ana },
});
