import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { renkler, yazi, bosluk, yaricap, isima } from "../tasarim";
import { Basilabilir } from "./Basilabilir";

/**
 * Boş durum (empty state).
 *
 * "Henüz kuponun yok." tek başına bir çıkmaz sokak: kullanıcıya durumu
 * söylüyor ama ne yapacağını söylemiyor. Buradaki üçlü hep birlikte
 * duruyor — line-art bir illüstrasyon (ekranı ıssız bırakmıyor), tek
 * cümlelik bir açıklama ve TEK bir çıkış yolu (birincil buton).
 *
 * İllüstrasyonlar bilerek SVG ve tema renklerine bağlı: hazır bir PNG
 * seti koyu temada beyaz kenarlıklarla "yapıştırılmış" duruyor, üstelik
 * paket boyutunu şişiriyordu.
 */
export function BosDurum({
  cizim,
  baslik,
  aciklama,
  butonMetni,
  onButon,
}: {
  cizim: "cuzdan" | "rota" | "favori" | "bildirim";
  baslik: string;
  aciklama: string;
  butonMetni?: string;
  onButon?: () => void;
}) {
  const Cizim = CIZIMLER[cizim];

  return (
    <View style={stiller.kap}>
      <Animated.View entering={FadeIn.duration(500)}>
        <Cizim />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(420).springify()} style={stiller.metinler}>
        <Text style={stiller.baslik}>{baslik}</Text>
        <Text style={stiller.aciklama}>{aciklama}</Text>
      </Animated.View>

      {butonMetni && onButon ? (
        <Animated.View entering={FadeInDown.delay(220).duration(420).springify()} style={{ width: "100%" }}>
          <Basilabilir
            style={[stiller.buton, isima(renkler.vurgu)]}
            onPress={onButon}
            titresim="orta"
            accessibilityRole="button"
          >
            <Text style={yazi.buton}>{butonMetni}</Text>
          </Basilabilir>
        </Animated.View>
      ) : null}
    </View>
  );
}

const CIZIM_BOYUTU = 132;

function GradyanTanimi() {
  return (
    <Defs>
      <SvgGradient id="bosDurum" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={renkler.vurguParlak} stopOpacity="0.9" />
        <Stop offset="1" stopColor={renkler.odul} stopOpacity="0.75" />
      </SvgGradient>
    </Defs>
  );
}

const cizgi = {
  stroke: "url(#bosDurum)",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function CuzdanCizimi() {
  return (
    <Svg width={CIZIM_BOYUTU} height={CIZIM_BOYUTU} viewBox="0 0 120 120">
      <GradyanTanimi />
      <Circle cx="60" cy="60" r="46" stroke={renkler.katmanYuksek} strokeWidth="1.5" fill="none" />
      <Path d="M32 46h48a6 6 0 016 6v26a6 6 0 01-6 6H32a6 6 0 01-6-6V46z" {...cizgi} />
      <Path d="M26 52c0-6 4-9 9-10l38-8c4-1 7 2 7 6v6" {...cizgi} />
      <Circle cx="76" cy="65" r="4.5" {...cizgi} />
      <Path d="M52 96l4 8m12-8l-4 8" {...cizgi} strokeWidth="1.6" opacity={0.5} />
    </Svg>
  );
}

function RotaCizimi() {
  return (
    <Svg width={CIZIM_BOYUTU} height={CIZIM_BOYUTU} viewBox="0 0 120 120">
      <GradyanTanimi />
      <Circle cx="60" cy="60" r="46" stroke={renkler.katmanYuksek} strokeWidth="1.5" fill="none" />
      <Path d="M36 84c0-10 12-10 24-14s24-6 24-18" {...cizgi} strokeDasharray="5 6" />
      <Path d="M36 44a8 8 0 1116 0c0 6-8 14-8 14s-8-8-8-14z" {...cizgi} />
      <Circle cx="44" cy="44" r="2.6" {...cizgi} />
      <Path d="M76 76a8 8 0 1116 0c0 6-8 14-8 14s-8-8-8-14z" {...cizgi} />
      <Circle cx="84" cy="76" r="2.6" {...cizgi} />
    </Svg>
  );
}

function FavoriCizimi() {
  return (
    <Svg width={CIZIM_BOYUTU} height={CIZIM_BOYUTU} viewBox="0 0 120 120">
      <GradyanTanimi />
      <Circle cx="60" cy="60" r="46" stroke={renkler.katmanYuksek} strokeWidth="1.5" fill="none" />
      <Path
        d="M60 84s-20-13-20-27a11 11 0 0120-6 11 11 0 0120 6c0 14-20 27-20 27z"
        {...cizgi}
      />
      <Path d="M40 40l-5-5m45 5l5-5M60 30v-6" {...cizgi} strokeWidth="1.6" opacity={0.5} />
    </Svg>
  );
}

function BildirimCizimi() {
  return (
    <Svg width={CIZIM_BOYUTU} height={CIZIM_BOYUTU} viewBox="0 0 120 120">
      <GradyanTanimi />
      <Circle cx="60" cy="60" r="46" stroke={renkler.katmanYuksek} strokeWidth="1.5" fill="none" />
      <Path d="M44 76V56a16 16 0 0132 0v20l5 7H39l5-7z" {...cizgi} />
      <Path d="M54 88a6 6 0 0012 0" {...cizgi} />
      <Path d="M60 40v-6" {...cizgi} />
    </Svg>
  );
}

const CIZIMLER = {
  cuzdan: CuzdanCizimi,
  rota: RotaCizimi,
  favori: FavoriCizimi,
  bildirim: BildirimCizimi,
};

const stiller = StyleSheet.create({
  kap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: bosluk.xxxl,
    paddingHorizontal: bosluk.xl,
    gap: bosluk.l,
  },
  metinler: { alignItems: "center", gap: bosluk.s },
  baslik: { ...yazi.bolumBasligi, textAlign: "center" },
  aciklama: {
    ...yazi.govde,
    textAlign: "center",
    maxWidth: 280,
  },
  buton: {
    backgroundColor: renkler.vurgu,
    borderRadius: yaricap.m,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: bosluk.s,
  },
});
