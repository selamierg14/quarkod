import { useState } from "react";
import { View, Text, StyleSheet, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { renkler, yazi, bosluk, yaricap, golge, isima } from "../../tasarim";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { API_TABAN } from "../../api/istemci";

/** WhatsApp logosu — marka tanınırlığı için gerçek yol verisi. */
function WhatsAppSimgesi({ boyut = 18 }: { boyut?: number }) {
  return (
    <Svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </Svg>
  );
}

/**
 * Davet kartı.
 *
 * Uygulamanın büyüme motoru burası olduğu için ekranın en "pahalı"
 * görünen bileşeni: mor-indigo gradyan zemin ve ışıyan birincil buton.
 * Kod, kopyalanabilir bir kutuda ayrı duruyor — paylaşım düğmesine
 * basmak istemeyen (WhatsApp kullanmayan) kullanıcı için ikinci bir yol.
 */
export function DavetKarti({
  davetKodu,
  davetEdilenSayisi,
}: {
  davetKodu: string;
  davetEdilenSayisi: number;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const davetLinki = `${API_TABAN}/kayit?ref=${davetKodu}`;

  async function kopyala() {
    await Clipboard.setStringAsync(davetLinki);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1600);
  }

  async function paylas() {
    const metin = `Biyerlere'de şehrin en iyi mekanlarını keşfediyorum — sen de katıl, ikimiz de ücretsiz kahve kazanalım! ${davetLinki}`;
    try {
      // Sistem paylaşım sayfası: WhatsApp'a doğrudan derin bağlantı
      // atmak, uygulama kurulu değilse boş bir ekrana düşürüyordu.
      // Paylaşım sayfası kurulu olanı gösteriyor.
      await Share.share(Platform.OS === "ios" ? { message: metin } : { message: metin });
    } catch {
      // Kullanıcı vazgeçti — sessizce geç.
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(420).springify()}>
      <View style={[stiller.kap, golge("l", renkler.vurgu)]}>
        <LinearGradient
          colors={["rgba(124,107,255,0.35)", "rgba(236,72,153,0.14)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Text style={stiller.baslik}>Arkadaşını davet et, ikiniz de kazanın 🎁</Text>
        <Text style={stiller.aciklama}>
          Davet kodunla kaydolan arkadaşın ve sen 100&apos;er puan kazanırsınız.
          {davetEdilenSayisi > 0 ? ` Şimdiye kadar ${davetEdilenSayisi} kişi davet ettin.` : ""}
        </Text>

        <Basilabilir style={stiller.kodKutusu} onPress={kopyala} titresim="yok">
          <Text style={stiller.kod}>{davetKodu}</Text>
          <Text style={stiller.kopyalaMetni}>
            {kopyalandi ? "Kopyalandı ✓" : "Kodu kopyala"}
          </Text>
        </Basilabilir>

        <Basilabilir
          style={[stiller.paylasButonu, isima(renkler.vurgu)]}
          onPress={paylas}
          titresim="orta"
          accessibilityRole="button"
          accessibilityLabel="WhatsApp'ta davet et"
        >
          <WhatsAppSimgesi />
          <Text style={yazi.buton}>WhatsApp&apos;ta davet et</Text>
        </Basilabilir>
      </View>
    </Animated.View>
  );
}

const stiller = StyleSheet.create({
  kap: {
    backgroundColor: renkler.katman,
    borderRadius: yaricap.xl,
    padding: bosluk.xl,
    gap: bosluk.m,
    overflow: "hidden",
  },
  baslik: { ...yazi.kartBasligi, fontSize: 16, lineHeight: 22 },
  aciklama: { ...yazi.govde, fontSize: 13, lineHeight: 18 },
  kodKutusu: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.l,
    minHeight: 48,
  },
  kod: {
    ...yazi.kartBasligi,
    fontSize: 16,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  kopyalaMetni: { ...yazi.kucuk, color: renkler.metin.govde },
  paylasButonu: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: bosluk.s,
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 50,
  },
});
