import { View, Text, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { MekanDetay } from "../../api/tipler";
import { renkler, yazi, bosluk, yaricap, fontlar } from "../../tasarim";

const KART_GENISLIGI = 268;

/**
 * "%100 doğrulanmış masa yorumları".
 *
 * Bu bölümün tamamı ürünün en güçlü satış argümanı: yorumlar yalnızca
 * masada oturup fiziksel karekodu okutmuş kişilerden geliyor, yani
 * uzaktan yazılamıyor. Rozet bunu her yorumun ÜSTÜNDE tekrar tekrar
 * söylemiyor — bir kez, bölüm başlığında söylüyor ve orada duruyor.
 *
 * Dikey liste yerine yatay kart şeridi: yorumlar detay sayfasının sonunda
 * duruyor ve dikey liste sayfayı iki katına çıkarıyordu; şeritte
 * "yorumlar var" bilgisi tek bakışta veriliyor, okumak isteyen kaydırıyor.
 */
export function YorumBolumu({
  yorumlar,
  toplamDegerlendirme,
}: {
  yorumlar: MekanDetay["dogrulanmisYorumlar"];
  toplamDegerlendirme: number;
}) {
  if (yorumlar.length === 0) {
    return (
      <View style={{ gap: bosluk.s }}>
        <Text style={yazi.bolumBasligi}>Yorumlar</Text>
        <View style={stiller.bosKart}>
          <Text style={yazi.govde}>
            {toplamDegerlendirme > 0
              ? "Bu mekan puanlandı ama henüz yazılı yorum yok. İlk yazan sen ol — masadaki karekodu okut."
              : "Henüz yorum yok. Masadaki karekodu okutup ilk yorumu sen bırakabilirsin."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: bosluk.m }}>
      <View style={{ gap: 2 }}>
        <Text style={yazi.bolumBasligi}>Doğrulanmış yorumlar</Text>
        <Text style={yazi.kucuk}>
          ✅ Yalnızca masada oturup karekod okutan kişilerin yorumları
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: bosluk.m, paddingRight: bosluk.xl }}
        snapToInterval={KART_GENISLIGI + bosluk.m}
        decelerationRate="fast"
      >
        {yorumlar.map((yorum) => (
          <View key={yorum.id} style={stiller.kart}>
            <LinearGradient
              colors={[renkler.vurguSoluk, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={stiller.ust}>
              <View style={stiller.avatar}>
                <Text style={stiller.avatarHarfi}>
                  {yorum.isim.trim().charAt(0).toLocaleUpperCase("tr")}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={stiller.isim} numberOfLines={1}>
                  {yorum.isim}
                </Text>
                <Text style={stiller.tarih}>{tarihMetni(yorum.tarih)}</Text>
              </View>
              {yorum.puan !== null ? (
                <Text style={stiller.puan}>{"★".repeat(Math.round(yorum.puan))}</Text>
              ) : null}
            </View>
            <Text style={stiller.yorum} numberOfLines={4}>
              {yorum.yorum}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

const stiller = StyleSheet.create({
  kart: {
    width: KART_GENISLIGI,
    gap: bosluk.m,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    overflow: "hidden",
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  ust: { flexDirection: "row", alignItems: "center", gap: bosluk.s },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: yaricap.tam,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: renkler.katmanYuksek,
  },
  avatarHarfi: {
    fontFamily: fontlar.kalin,
    fontSize: 14,
    color: renkler.vurguParlak,
  },
  isim: { fontFamily: fontlar.yariKalin, fontSize: 13, color: renkler.metin.ana },
  tarih: { ...yazi.kucuk, fontSize: 11 },
  puan: { fontSize: 12, color: renkler.odulParlak, letterSpacing: -1 },
  yorum: { ...yazi.govde, fontSize: 13, lineHeight: 19 },
  bosKart: {
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
});
