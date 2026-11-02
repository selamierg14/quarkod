import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { Cip } from "../../bilesenler/Cip";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { renkler, bosluk, yaricap, fontlar } from "../../tasarim";
import {
  turAdlari,
  turSirasi,
  ozellikAdlari,
  ozellikSimgeleri,
  oneCikanOzellikler,
} from "../mekan/etiketler";

export type SuzgecDurumu = {
  arama: string;
  tur: string | null;
  ozellikler: string[];
  /** "Şimdi açık" — süzme sunucuda, çalışma saatlerine göre. */
  yalnizcaAcik: boolean;
};

export const BOS_SUZGEC: SuzgecDurumu = {
  arama: "",
  tur: null,
  ozellikler: [],
  yalnizcaAcik: false,
};

export function suzgecBosMu(s: SuzgecDurumu): boolean {
  return (
    s.arama.trim() === "" &&
    s.tur === null &&
    s.ozellikler.length === 0 &&
    !s.yalnizcaAcik
  );
}

/**
 * Keşfet'in arama kutusu ve filtre çipleri.
 *
 * Uygulamada mekan aramanın hiçbir yolu yoktu: web'deki /ara sayfasının
 * kategori ve özellik filtreleri mobilde karşılıksızdı, kullanıcı 52
 * mekanı yatay şeritlerde kaydırmak zorundaydı.
 *
 * Süzme SUNUCUDA yapılıyor (bkz. lib/kesfet.ts) — istemcide filtrelemek
 * yalnızca o an inmiş listeyi daraltırdı, oysa liste sayfalanıyor ve
 * konuma göre sıralanıyor. Aynı kurallar web ve mobilde tek yerden
 * geliyor, "priz filtresi iki platformda farklı davranıyor" durumu
 * doğmuyor.
 */
export function Suzgec({
  durum,
  onDegis,
}: {
  durum: SuzgecDurumu;
  onDegis: (yeni: SuzgecDurumu) => void;
}) {
  function turSec(tur: string | null) {
    onDegis({ ...durum, tur: durum.tur === tur ? null : tur });
  }

  function ozellikSec(ozellik: string) {
    const varMi = durum.ozellikler.includes(ozellik);
    onDegis({
      ...durum,
      ozellikler: varMi
        ? durum.ozellikler.filter((o) => o !== ozellik)
        : [...durum.ozellikler, ozellik],
    });
  }

  return (
    <View style={{ gap: bosluk.m }}>
      <View style={stiller.aramaKutusu}>
        <Text style={stiller.aramaSimgesi}>🔍</Text>
        <TextInput
          value={durum.arama}
          onChangeText={(metin) => onDegis({ ...durum, arama: metin })}
          placeholder="Mekan ya da semt ara"
          placeholderTextColor={renkler.metin.soluk}
          style={stiller.aramaGirdisi}
          returnKeyType="search"
          autoCorrect={false}
          // Koyu temada iOS varsayılan olarak koyu imleç çiziyor.
          selectionColor={renkler.vurguParlak}
          clearButtonMode="while-editing"
        />
        {/* Android'de `clearButtonMode` yok; kendi temizleme düğmemiz. */}
        {durum.arama.length > 0 ? (
          <Basilabilir
            onPress={() => onDegis({ ...durum, arama: "" })}
            olcek={0.85}
            accessibilityLabel="Aramayı temizle"
            style={stiller.temizle}
          >
            <Text style={stiller.temizleMetni}>✕</Text>
          </Basilabilir>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={stiller.cipSeridi}
        keyboardShouldPersistTaps="handled"
      >
        <Cip
          metin="Tümü"
          secili={suzgecBosMu({ ...durum, arama: "" })}
          onPress={() => onDegis({ ...BOS_SUZGEC, arama: durum.arama })}
        />
        {/* "Şimdi açık" çipler arasında EN BAŞTA ve ayracın solunda:
            kullanıcının en sık sorduğu soru bu ve kategori seçmeden de
            anlamlı — "şu an açık olan ne varsa göster". */}
        <Cip
          metin="Şimdi açık"
          simge="🟢"
          secili={durum.yalnizcaAcik}
          onPress={() => onDegis({ ...durum, yalnizcaAcik: !durum.yalnizcaAcik })}
        />
        {turSirasi.map((tur) => (
          <Cip
            key={tur}
            metin={turAdlari[tur]}
            secili={durum.tur === tur}
            onPress={() => turSec(tur)}
          />
        ))}
        <View style={stiller.ayirac} />
        {oneCikanOzellikler.map((ozellik) => (
          <Cip
            key={ozellik}
            metin={ozellikAdlari[ozellik]}
            simge={ozellikSimgeleri[ozellik]}
            secili={durum.ozellikler.includes(ozellik)}
            onPress={() => ozellikSec(ozellik)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const stiller = StyleSheet.create({
  aramaKutusu: {
    marginHorizontal: bosluk.xl,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.s,
    paddingHorizontal: bosluk.m,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  aramaSimgesi: { fontSize: 15, opacity: 0.7 },
  aramaGirdisi: {
    flex: 1,
    fontFamily: fontlar.normal,
    fontSize: 15,
    color: renkler.metin.ana,
    // Android girdi alanına kendi dikey boşluğunu ekliyor.
    paddingVertical: 0,
  },
  temizle: {
    minHeight: 0,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
  },
  temizleMetni: { fontSize: 11, color: renkler.metin.govde },
  cipSeridi: {
    paddingHorizontal: bosluk.xl,
    gap: bosluk.s,
    alignItems: "center",
  },
  ayirac: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: renkler.cizgiBelirgin,
    marginHorizontal: bosluk.xs,
  },
});
