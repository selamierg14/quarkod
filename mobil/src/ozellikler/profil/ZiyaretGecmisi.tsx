import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Gorsel } from "../../bilesenler/Gorsel";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { renkler, yazi, bosluk, yaricap } from "../../tasarim";
import type { ProfilYaniti } from "../../api/tipler";

type Ziyaret = ProfilYaniti["sonZiyaretler"][number];

/**
 * "Son ziyaretlerin" listesi.
 *
 * Bu veri sunucudan HER ZAMAN geliyordu (`/api/app/profil` → sonZiyaretler)
 * ama mobilde hiç çizilmiyordu. Kullanıcı karekod okutup puan kazanıyor,
 * sonra nereye gittiğini gösteren bir yer bulamıyordu — oysa ziyaret
 * geçmişi, puanların nereden geldiğini açıklayan tek ekran.
 *
 * Tarih GÖRECELİ yazılıyor ("dün", "3 gün önce"): "14.09.2026" bir
 * kullanıcıya hiçbir şey hissettirmiyor, "dün" hatırlatıyor.
 */
export function ZiyaretGecmisi({ ziyaretler }: { ziyaretler: Ziyaret[] }) {
  const router = useRouter();
  if (ziyaretler.length === 0) return null;

  return (
    <View style={{ gap: bosluk.m }}>
      <Text style={yazi.bolumBasligi}>📍 Son ziyaretlerin</Text>
      <View style={{ gap: bosluk.s }}>
        {ziyaretler.map((ziyaret) => (
          <Basilabilir
            key={ziyaret.id}
            onPress={() => router.push(`/mekan/${ziyaret.mekan.slug}`)}
            style={stiller.satir}
            olcek={0.985}
            accessibilityRole="button"
            accessibilityLabel={`${ziyaret.mekan.ad}, ${goreceliTarih(ziyaret.tarih)}`}
          >
            <View style={stiller.gorsel}>
              <Gorsel
                kaynak={ziyaret.mekan.logoUrl}
                markaRengi={renkler.vurgu}
                stil={StyleSheet.absoluteFill}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={yazi.kartBasligi} numberOfLines={1}>
                {ziyaret.mekan.ad}
              </Text>
              <Text style={yazi.kucuk}>{goreceliTarih(ziyaret.tarih)}</Text>
            </View>
            <Text style={stiller.ok}>›</Text>
          </Basilabilir>
        ))}
      </View>
    </View>
  );
}

/**
 * "Bugün", "dün", "3 gün önce", sonra tarih.
 *
 * Eşik bir haftada: ondan sonrası için "23 gün önce" demek, okuyanın
 * kafasında tarihe çevirmesi gereken bir sayı üretiyor.
 */
export function goreceliTarih(isoTarih: string): string {
  const tarih = new Date(isoTarih);
  if (Number.isNaN(tarih.getTime())) return "";

  // Gün farkı TAKVİM GÜNÜ üzerinden: saat farkını 24'e bölmek, dün
  // 23:00'te yapılan ziyareti bugün 08:00'de "bugün" gösteriyordu.
  const gunBasi = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fark = Math.round((gunBasi(new Date()) - gunBasi(tarih)) / 86_400_000);

  if (fark <= 0) return "Bugün";
  if (fark === 1) return "Dün";
  if (fark < 7) return `${fark} gün önce`;
  return tarih.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

const stiller = StyleSheet.create({
  satir: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
    padding: bosluk.s,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  gorsel: {
    width: 44,
    height: 44,
    borderRadius: yaricap.m,
    overflow: "hidden",
    backgroundColor: renkler.katmanYuksek,
  },
  ok: { fontSize: 20, color: renkler.metin.soluk, paddingRight: bosluk.xs },
});
