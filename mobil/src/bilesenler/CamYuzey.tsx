import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { renkler, yaricap } from "../tasarim";

/**
 * Buzlu cam yüzey (glassmorphism).
 *
 * Alt navigasyon ve harita üstündeki yüzen kartlar için: içerik altından
 * geçerken tamamen kaybolmuyor, bulanıklaşıyor — bu, panelin ekranın
 * ÜSTÜNDE yüzdüğünü anlatan en ucuz ipucu.
 *
 * Bulanıklık tek başına yetmiyor: koyu temada BlurView'ın arkası açık
 * kalıyor ve üstündeki beyaz metin okunmuyor. Bu yüzden camın üstüne
 * her zaman ince bir renk katmanı biniyor (`renkler.cam`). Android'de
 * blur pahalı ve sürüme göre tutarsız çalıştığı için orada doğrudan
 * yarı saydam katmana düşüyoruz — kullanıcı farkı görmüyor, kare
 * düşüşünü görüyordu.
 */
export function CamYuzey({
  yogunluk = 40,
  stil,
  children,
}: {
  yogunluk?: number;
  stil?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  if (Platform.OS === "android") {
    return (
      <View style={[{ backgroundColor: renkler.camKoyu, overflow: "hidden" }, stil]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{ overflow: "hidden" }, stil]}>
      <BlurView intensity={yogunluk} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: renkler.cam }]} />
      {children}
    </View>
  );
}

/** Cam kart — yüzen detay panelleri için hazır sarmalayıcı. */
export function CamKart({
  stil,
  children,
}: {
  stil?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <CamYuzey
      stil={[
        {
          borderRadius: yaricap.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: renkler.cizgi,
        },
        stil,
      ]}
    >
      {children}
    </CamYuzey>
  );
}
