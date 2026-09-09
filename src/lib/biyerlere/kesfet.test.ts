import { describe, expect, it } from "vitest";
import {
  EN_BUYUK_YARICAP_METRE,
  VARSAYILAN_YARICAP_METRE,
  mekanlariSuz,
  sinirKutusu,
  sorguCoz,
  type KesfetSorgusu,
} from "./kesfet";
import { mesafeMetre } from "./mekan";

/**
 * Keşfet süzme kuralları.
 *
 * Buradaki bir kırmızı kullanıcıya yanlış liste gösterir: "priz" filtresi
 * prizsiz mekanı geçirir ya da 20 km ötedeki kafe "çevrende" diye çıkar.
 */

// Kadıköy Moda civarı; aralarındaki mesafeler bilinçli seçildi.
const MERKEZ = { enlem: 40.9819, boylam: 29.0257 };

function mekan(
  ad: string,
  ekler: Partial<{
    enlem: number;
    boylam: number;
    segment: string | null;
    ozellikler: string | null;
    tur: string;
  }> = {},
) {
  return {
    id: ad,
    name: ad,
    type: ekler.tur ?? "yeme_icme",
    latitude: ekler.enlem ?? MERKEZ.enlem,
    longitude: ekler.boylam ?? MERKEZ.boylam,
    priceSegment: ekler.segment ?? null,
    mekanOzellikleri: ekler.ozellikler ?? null,
  };
}

const BOS_SORGU: KesfetSorgusu = {
  konum: null,
  yaricapMetre: VARSAYILAN_YARICAP_METRE,
  ozellikler: [],
  segment: null,
  tur: null,
  arama: "",
};

describe("sorgu çözümü", () => {
  it("boş sorguda varsayılanlar", () => {
    const s = sorguCoz(new URLSearchParams());
    expect(s.konum).toBeNull();
    expect(s.yaricapMetre).toBe(VARSAYILAN_YARICAP_METRE);
    expect(s.ozellikler).toEqual([]);
    expect(s.segment).toBeNull();
  });

  it("geçerli konumu okur", () => {
    const s = sorguCoz(new URLSearchParams({ enlem: "40.98", boylam: "29.02" }));
    expect(s.konum).toEqual({ enlem: 40.98, boylam: 29.02 });
  });

  it("geçersiz konumu yok sayar", () => {
    // Yarım koordinat ya da aralık dışı değer, konumsuz sorguya düşer —
    // uydurma bir merkeze göre mesafe hesaplamaktansa mesafesiz liste.
    expect(sorguCoz(new URLSearchParams({ enlem: "40.98" })).konum).toBeNull();
    expect(
      sorguCoz(new URLSearchParams({ enlem: "999", boylam: "29" })).konum,
    ).toBeNull();
  });

  it("yarıçapı sınırlar", () => {
    expect(sorguCoz(new URLSearchParams({ mesafe: "999999" })).yaricapMetre).toBe(
      EN_BUYUK_YARICAP_METRE,
    );
    expect(sorguCoz(new URLSearchParams({ mesafe: "5" })).yaricapMetre).toBe(100);
    expect(sorguCoz(new URLSearchParams({ mesafe: "abc" })).yaricapMetre).toBe(
      VARSAYILAN_YARICAP_METRE,
    );
  });

  it("tanınmayan özelliği ve segmenti sessizce atar", () => {
    // Mobil uygulamanın eski sürümü kaldırılmış bir ad gönderirse
    // kullanıcı hata değil, o filtre yokmuş gibi bir liste görsün.
    const s = sorguCoz(
      new URLSearchParams({ ozellik: "priz,uydurma,wifi", segment: "bedava" }),
    );
    expect(s.ozellikler).toEqual(["priz", "wifi"]);
    expect(s.segment).toBeNull();
  });

  it("geçerli türü okur, tanınmayanı yok sayar", () => {
    expect(sorguCoz(new URLSearchParams({ tur: "balikci" })).tur).toBe("balikci");
    expect(sorguCoz(new URLSearchParams({ tur: "cafe" })).tur).toBeNull();
  });
});

describe("özellik süzmesi", () => {
  const adaylar = [
    mekan("Prizli Kafe", { ozellikler: "priz,wifi" }),
    mekan("Bahçeli Kafe", { ozellikler: "bahce" }),
    mekan("Tam Donanım", { ozellikler: "priz,wifi,bahce" }),
    mekan("Özelliksiz", { ozellikler: null }),
  ];

  it("filtresizken hepsi gelir", () => {
    expect(mekanlariSuz(adaylar, BOS_SORGU)).toHaveLength(4);
  });

  it("tek özellik süzer", () => {
    const sonuc = mekanlariSuz(adaylar, { ...BOS_SORGU, ozellikler: ["priz"] });
    expect(sonuc.map((m) => m.name).sort()).toEqual(["Prizli Kafe", "Tam Donanım"]);
  });

  it("birden fazla özellik KESİŞİM olarak çalışır", () => {
    // "priz + bahçe" ikisi birden olanı getirmeli; biri olanı değil.
    const sonuc = mekanlariSuz(adaylar, {
      ...BOS_SORGU,
      ozellikler: ["priz", "bahce"],
    });
    expect(sonuc.map((m) => m.name)).toEqual(["Tam Donanım"]);
  });
});

describe("segment süzmesi", () => {
  const adaylar = [
    mekan("Ucuz", { segment: "ucuz" }),
    mekan("Orta", { segment: "orta" }),
    mekan("Belirtilmemiş", { segment: null }),
  ];

  it("seçilen segmenti getirir", () => {
    const sonuc = mekanlariSuz(adaylar, { ...BOS_SORGU, segment: "ucuz" });
    expect(sonuc.map((m) => m.name)).toEqual(["Ucuz"]);
  });

  it("segmenti belirtilmemiş mekan segment filtresinde çıkmaz", () => {
    const sonuc = mekanlariSuz(adaylar, { ...BOS_SORGU, segment: "orta" });
    expect(sonuc.map((m) => m.name)).toEqual(["Orta"]);
  });
});

describe("tür süzmesi", () => {
  const adaylar = [
    mekan("Lokanta", { tur: "yeme_icme" }),
    mekan("Balık Evi", { tur: "balikci" }),
    mekan("Gece Kulübü", { tur: "gece_kulubu" }),
  ];

  it("filtresizken hepsi gelir", () => {
    expect(mekanlariSuz(adaylar, BOS_SORGU)).toHaveLength(3);
  });

  it("seçilen türü getirir", () => {
    const sonuc = mekanlariSuz(adaylar, { ...BOS_SORGU, tur: "balikci" });
    expect(sonuc.map((m) => m.name)).toEqual(["Balık Evi"]);
  });
});

describe("mesafe süzmesi ve sıralama", () => {
  // ~110 m, ~1.1 km ve ~11 km kuzeydeki noktalar.
  const yakin = mekan("Yakın", { enlem: MERKEZ.enlem + 0.001 });
  const orta = mekan("Orta", { enlem: MERKEZ.enlem + 0.01 });
  const uzak = mekan("Uzak", { enlem: MERKEZ.enlem + 0.1 });
  const adaylar = [uzak, yakin, orta];

  it("yarıçap dışını eler", () => {
    const sonuc = mekanlariSuz(adaylar, {
      ...BOS_SORGU,
      konum: MERKEZ,
      yaricapMetre: 5_000,
    });
    expect(sonuc.map((m) => m.name)).toEqual(["Yakın", "Orta"]);
  });

  it("en yakından uzağa sıralar", () => {
    const sonuc = mekanlariSuz(adaylar, {
      ...BOS_SORGU,
      konum: MERKEZ,
      yaricapMetre: 50_000,
    });
    expect(sonuc.map((m) => m.name)).toEqual(["Yakın", "Orta", "Uzak"]);
  });

  it("mesafe metre olarak dönüyor", () => {
    const sonuc = mekanlariSuz([yakin], { ...BOS_SORGU, konum: MERKEZ });
    expect(sonuc[0].mesafeMetre).toBeGreaterThan(100);
    expect(sonuc[0].mesafeMetre).toBeLessThan(125);
  });

  it("konum yoksa mesafe null ve sıralama ada göre", () => {
    const sonuc = mekanlariSuz(adaylar, BOS_SORGU);
    expect(sonuc.every((m) => m.mesafeMetre === null)).toBe(true);
    expect(sonuc.map((m) => m.name)).toEqual(["Orta", "Uzak", "Yakın"]);
  });

  it("konum verilmişken koordinatsız mekan listeye girmez", () => {
    const koordinatsiz = { ...mekan("Koordinatsız"), latitude: null, longitude: null };
    const sonuc = mekanlariSuz([koordinatsiz, yakin], {
      ...BOS_SORGU,
      konum: MERKEZ,
    });
    expect(sonuc.map((m) => m.name)).toEqual(["Yakın"]);
  });
});

describe("sınır kutusu", () => {
  it("yarıçaptaki bir noktayı kutunun içinde bırakır", () => {
    // Kutu daireden geniş olmalı: kaçırılan mekan olmamalı.
    const yaricap = 1_000;
    const kutu = sinirKutusu(MERKEZ, yaricap);
    const nokta = { enlem: MERKEZ.enlem + 0.008, boylam: MERKEZ.boylam };

    expect(mesafeMetre(MERKEZ, nokta)).toBeLessThan(yaricap);
    expect(nokta.enlem).toBeGreaterThan(kutu.enlemMin);
    expect(nokta.enlem).toBeLessThan(kutu.enlemMax);
  });

  it("boylam sınırı enleme göre genişliyor", () => {
    // Kuzeyde boylam dereceleri daralır; kutu bunu telafi etmezse
    // gerçekten yakın mekanlar listeden düşerdi.
    const ekvator = sinirKutusu({ enlem: 0, boylam: 30 }, 1_000);
    const kuzey = sinirKutusu({ enlem: 60, boylam: 30 }, 1_000);

    const ekvatorGenislik = ekvator.boylamMax - ekvator.boylamMin;
    const kuzeyGenislik = kuzey.boylamMax - kuzey.boylamMin;
    expect(kuzeyGenislik).toBeGreaterThan(ekvatorGenislik * 1.8);
  });
});
