import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { renkler, yazi, bosluk, yaricap } from "../tasarim";
import { Basilabilir } from "./Basilabilir";
import { useOturum } from "../store/oturum";
import { acikYontemler, kimlikJetonuAl, type Saglayici } from "../kimlik/sosyal";

/**
 * "Apple ile devam et" / "Google ile devam et".
 *
 * Giriş ve kayıt ekranlarının ikisinde de aynı bileşen: kullanıcı için
 * ikisi arasında fark yok (ilk girişte hesap açılıyor, sonrakinde giriş
 * yapılıyor) ve bunu iki ekranda ayrı yazmak, er geç ayrışırdı.
 *
 * YAPILANDIRILMAMIŞSA HİÇ ÇİZİLMİYOR: sunucu hangi yöntemlerin açık
 * olduğunu söylüyor (bkz. src/kimlik/sosyal.ts). Dokunulduğunda hata
 * veren bir düğme, olmayan düğmeden kötüdür.
 */
export function SosyalGirisDugmeleri({ onBasarili }: { onBasarili: () => void }) {
  const sosyalGiris = useOturum((s) => s.sosyalGiris);
  const [yontemler, setYontemler] = useState<Saglayici[]>([]);
  const [islenen, setIslenen] = useState<Saglayici | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    acikYontemler().then((liste) => {
      if (!iptal) setYontemler(liste);
    });
    return () => {
      iptal = true;
    };
  }, []);

  async function dene(saglayici: Saglayici) {
    setHata(null);
    setIslenen(saglayici);

    const jeton = await kimlikJetonuAl(saglayici);
    if (!jeton.ok) {
      setIslenen(null);
      // İptal bir hata değil: kullanıcı vazgeçtiyse ekranda kırmızı bir
      // satır bırakmak, kendi kararını hata gibi göstermek olurdu.
      if (!jeton.iptal) setHata(jeton.hata);
      return;
    }

    const sonuc = await sosyalGiris(saglayici, jeton.jeton, jeton.ad);
    setIslenen(null);
    if (!sonuc.ok) {
      setHata(sonuc.hata ?? "Giriş yapılamadı.");
      return;
    }
    onBasarili();
  }

  if (yontemler.length === 0) return null;

  return (
    <View style={{ gap: bosluk.m }}>
      <View style={stiller.ayirac}>
        <View style={stiller.cizgi} />
        <Text style={yazi.kucuk}>veya</Text>
        <View style={stiller.cizgi} />
      </View>

      {yontemler.map((saglayici) => (
        <Basilabilir
          key={saglayici}
          style={stiller.dugme}
          onPress={() => void dene(saglayici)}
          disabled={islenen !== null}
          titresim="orta"
          accessibilityRole="button"
          accessibilityLabel={`${saglayici === "apple" ? "Apple" : "Google"} ile devam et`}
        >
          {islenen === saglayici ? (
            <ActivityIndicator color={renkler.metin.ana} />
          ) : (
            <Text style={stiller.dugmeMetni}>
              {saglayici === "apple" ? " Apple ile devam et" : "Google ile devam et"}
            </Text>
          )}
        </Basilabilir>
      ))}

      {hata ? <Text style={stiller.hata}>{hata}</Text> : null}
    </View>
  );
}

const stiller = StyleSheet.create({
  ayirac: { flexDirection: "row", alignItems: "center", gap: bosluk.m },
  cizgi: { flex: 1, height: 1, backgroundColor: renkler.cizgi },
  dugme: {
    minHeight: 52,
    borderRadius: yaricap.m,
    borderWidth: 1,
    borderColor: renkler.cizgiBelirgin,
    backgroundColor: renkler.katman,
    alignItems: "center",
    justifyContent: "center",
  },
  dugmeMetni: { ...yazi.govde, color: renkler.metin.ana, fontWeight: "600" },
  hata: { ...yazi.kucuk, color: renkler.uyari },
});
