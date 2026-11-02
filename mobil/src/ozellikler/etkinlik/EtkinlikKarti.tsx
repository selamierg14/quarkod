import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Gorsel } from "../../bilesenler/Gorsel";
import { Basilabilir } from "../../bilesenler/Basilabilir";
import { renkler, yazi, bosluk, yaricap } from "../../tasarim";
import type { KullaniciEtkinligi } from "../../api/tipler";

/**
 * Kullanıcı etkinliği kartı.
 *
 * İŞLETME DUYURUSUNDAN AYIRT EDİLEBİLİR OLMASI kartın en önemli işi:
 * "Ayşe açtı" satırı her kartta var ve kaldırılmamalı. Aynı ekranda
 * mekanın kendi duyurusu da görünüyor; ikisi karışırsa mekan, hiç haberi
 * olmadığı bir sözün altında kalıyor.
 */
export function EtkinlikKarti({
  etkinlik,
  onIlgi,
  onIptal,
}: {
  etkinlik: KullaniciEtkinligi;
  onIlgi: () => void;
  /** Yalnızca kendi etkinliğinde veriliyor. */
  onIptal?: () => void;
}) {
  const router = useRouter();
  const tarih = new Date(etkinlik.baslangic);

  /**
   * "Şu an" BİR KEZ okunuyor, her çizimde değil.
   *
   * `Date.now()` doğrudan çizim sırasında çağrılırsa aynı girdiyle aynı
   * çıktı garantisi kalmıyor ve React derleyicisi bunu hata sayıyor —
   * haklı olarak: kart yeniden çizildikçe etiketin sessizce değişmesi
   * öngörülemeyen bir davranış. `useState`in tembel başlatıcısı, saf
   * olmayan bir değeri bileşen ömrü boyunca sabitlemenin React'in kendi
   * önerdiği yolu.
   */
  const [simdi] = useState(() => Date.now());
  const basladi = tarih.getTime() <= simdi;

  return (
    <View style={stiller.kart}>
      <Basilabilir
        onPress={() => router.push(`/mekan/${etkinlik.mekan.slug}`)}
        style={stiller.ustSatir}
        olcek={0.99}
        accessibilityRole="button"
        accessibilityLabel={`${etkinlik.mekan.ad} sayfasına git`}
      >
        <View style={stiller.logo}>
          <Gorsel
            kaynak={etkinlik.mekan.logoUrl}
            markaRengi={renkler.vurgu}
            stil={StyleSheet.absoluteFill}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={yazi.kartBasligi} numberOfLines={2}>
            {etkinlik.baslik}
          </Text>
          <Text style={yazi.kucuk} numberOfLines={1}>
            {etkinlik.mekan.ad} · {tarihMetni(tarih)}
          </Text>
        </View>
      </Basilabilir>

      {etkinlik.aciklama ? (
        <Text style={stiller.aciklama} numberOfLines={3}>
          {etkinlik.aciklama}
        </Text>
      ) : null}

      <View style={stiller.altSatir}>
        {/* Açan kişi: kartın mekan değil KULLANICI sözü olduğunu söyleyen
            satır. "Sen açtın" ayrımı da burada. */}
        <Text style={stiller.acan} numberOfLines={1}>
          {etkinlik.benimMi ? "Sen açtın" : `${etkinlik.acan} açtı`}
          {basladi ? " · başladı" : ""}
        </Text>

        {etkinlik.benimMi ? (
          onIptal ? (
            <Basilabilir
              onPress={onIptal}
              style={stiller.iptal}
              olcek={0.94}
              accessibilityRole="button"
              accessibilityLabel="Etkinliği iptal et"
            >
              <Text style={stiller.iptalMetni}>İptal et</Text>
            </Basilabilir>
          ) : null
        ) : (
          <Basilabilir
            onPress={onIlgi}
            style={[stiller.ilgi, etkinlik.ilgilendimMi && stiller.ilgiSecili]}
            olcek={0.94}
            titresim="hafif"
            accessibilityRole="button"
            accessibilityState={{ selected: etkinlik.ilgilendimMi }}
            accessibilityLabel={
              etkinlik.ilgilendimMi
                ? `İlgilenmekten vazgeç, ${etkinlik.ilgiSayisi} kişi ilgileniyor`
                : `İlgileniyorum, ${etkinlik.ilgiSayisi} kişi ilgileniyor`
            }
          >
            <Text
              style={[stiller.ilgiMetni, etkinlik.ilgilendimMi && stiller.ilgiMetniSecili]}
            >
              {etkinlik.ilgilendimMi ? "★" : "☆"} {etkinlik.ilgiSayisi}
            </Text>
          </Basilabilir>
        )}
      </View>
    </View>
  );
}

/**
 * "Bugün 20:00", "Yarın 19:30", "23 Eylül Cumartesi 20:00".
 *
 * Buluşma çağrısında en kritik bilgi gün: "20:00" tek başına hangi gün
 * olduğunu söylemiyor ve kullanıcı yanlış akşam yola çıkabiliyor.
 */
export function tarihMetni(tarih: Date): string {
  const saat = tarih.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const gunBasi = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fark = Math.round((gunBasi(tarih) - gunBasi(new Date())) / 86_400_000);

  if (fark === 0) return `Bugün ${saat}`;
  if (fark === 1) return `Yarın ${saat}`;
  const gun = tarih.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  return `${gun} ${saat}`;
}

const stiller = StyleSheet.create({
  kart: {
    gap: bosluk.m,
    padding: bosluk.l,
    borderRadius: yaricap.l,
    backgroundColor: renkler.katman,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renkler.cizgi,
  },
  ustSatir: {
    minHeight: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.m,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: yaricap.m,
    overflow: "hidden",
    backgroundColor: renkler.katmanYuksek,
  },
  aciklama: { ...yazi.govde, fontSize: 13 },
  altSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.m },
  acan: { ...yazi.kucuk, fontSize: 11, flex: 1, color: renkler.metin.soluk },
  ilgi: {
    minHeight: 0,
    paddingHorizontal: bosluk.m,
    paddingVertical: 6,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.katmanYuksek,
  },
  ilgiSecili: { backgroundColor: renkler.vurguSoluk },
  ilgiMetni: {
    ...yazi.kucuk,
    fontSize: 13,
    color: renkler.metin.govde,
    fontVariant: ["tabular-nums"],
  },
  ilgiMetniSecili: { color: renkler.vurguParlak, fontWeight: "700" },
  iptal: {
    minHeight: 0,
    paddingHorizontal: bosluk.m,
    paddingVertical: 6,
    borderRadius: yaricap.tam,
    backgroundColor: "rgba(255,107,74,0.14)",
  },
  iptalMetni: { ...yazi.kucuk, fontSize: 12, color: renkler.uyari, fontWeight: "600" },
});
