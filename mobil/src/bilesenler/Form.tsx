import { useState } from "react";
import { View, Text, TextInput, StyleSheet, type TextInputProps } from "react-native";
import Svg, { Path } from "react-native-svg";
import { renkler, yazi, bosluk, yaricap, isima } from "../tasarim";
import { Basilabilir } from "./Basilabilir";

/**
 * Hesap ekranlarının (giriş, kayıt, şifre kurtarma, güvenlik) ortak parçaları.
 *
 * Giriş ekranı kendi `Alan` bileşenini taşıyordu; dört ekran daha
 * eklenince aynı girdi stili, aynı odak çerçevesi ve aynı hata satırı beş
 * kopyaya dağılacaktı. Kopyalar ayrışıyor ve ayrıştıkları yön hep aynı:
 * birinde 16px yazı kuralı unutuluyor ve iOS o ekranda sayfayı büyütüyor.
 */

export function FormAlani({
  etiket,
  ipucu,
  hataVar,
  ...girdi
}: {
  etiket: string;
  ipucu?: string;
  /** Kenarlığı kırmızıya çevirir (ör. şifreler uyuşmuyor). */
  hataVar?: boolean;
} & TextInputProps) {
  const [odakli, setOdakli] = useState(false);

  return (
    <View style={{ gap: bosluk.s }}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={renkler.metin.soluk}
        selectionColor={renkler.vurguParlak}
        {...girdi}
        onFocus={(e) => {
          setOdakli(true);
          girdi.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOdakli(false);
          girdi.onBlur?.(e);
        }}
        style={[
          stiller.girdi,
          odakli && { borderColor: renkler.vurgu },
          hataVar && { borderColor: renkler.uyari },
          girdi.style,
        ]}
      />
      {ipucu ? (
        <Text style={[yazi.kucuk, hataVar && { color: renkler.uyari }]}>{ipucu}</Text>
      ) : null}
    </View>
  );
}

export function AnaDugme({
  metin,
  bekleyenMetin,
  bekliyor,
  devreDisi,
  tehlikeli,
  onPress,
}: {
  metin: string;
  bekleyenMetin?: string;
  bekliyor?: boolean;
  devreDisi?: boolean;
  /** Geri alınamaz eylemler (hesap silme) için kırmızı. */
  tehlikeli?: boolean;
  onPress: () => void;
}) {
  const renk = tehlikeli ? renkler.uyari : renkler.vurgu;
  const kapali = Boolean(bekliyor || devreDisi);
  return (
    <Basilabilir
      style={[stiller.buton, { backgroundColor: renk }, isima(renk), kapali && { opacity: 0.6 }]}
      onPress={onPress}
      // Çift gönderimi engelleyen yer: şifre kurtarmada ikinci dokunuş
      // ikinci bir SMS demek.
      disabled={kapali}
      titresim="orta"
      accessibilityRole="button"
      accessibilityState={{ disabled: kapali, busy: Boolean(bekliyor) }}
    >
      <Text style={yazi.buton}>{bekliyor && bekleyenMetin ? bekleyenMetin : metin}</Text>
    </Basilabilir>
  );
}

/** Hata satırı; ekran okuyucu yeni hatayı duyursun diye canlı bölge. */
export function HataMetni({ mesaj }: { mesaj: string | null }) {
  if (!mesaj) return null;
  return (
    <Text style={stiller.hata} accessibilityLiveRegion="polite" accessibilityRole="alert">
      {mesaj}
    </Text>
  );
}

/** Geri düğmeli ekran başlığı — yığın ekranlarında ortak. */
export function EkranBasligi({ baslik, onGeri }: { baslik: string; onGeri: () => void }) {
  return (
    <View style={stiller.baslikSatiri}>
      <Basilabilir
        onPress={onGeri}
        style={stiller.geriDugmesi}
        olcek={0.88}
        accessibilityRole="button"
        accessibilityLabel="Geri"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 19l-7-7 7-7"
            stroke={renkler.metin.ana}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Basilabilir>
      <Text style={[yazi.ekranBasligi, { flex: 1 }]} numberOfLines={1}>
        {baslik}
      </Text>
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
    // 16px altı yazı boyutu iOS'ta sayfayı otomatik yakınlaştırıyor.
    fontSize: 16,
    color: renkler.metin.ana,
  },
  buton: {
    borderRadius: yaricap.m,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: bosluk.s,
  },
  hata: { ...yazi.kucuk, color: renkler.uyari },
  baslikSatiri: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    paddingHorizontal: bosluk.xl,
    paddingBottom: bosluk.m,
  },
  geriDugmesi: {
    width: 40,
    height: 40,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katman,
  },
});
