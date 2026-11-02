import { describe, expect, it } from "vitest";
import { saatleriCoz } from "../isletme/calisma-saati";
import type { MevcutRezervasyon } from "../isletme/rezervasyon";
import {
  EN_COK_ACIK_TALEP,
  EN_COK_KISI,
  baslangicCoz,
  iptalEdilebilirMi,
  kisiSayisiCoz,
  musaitSaatler,
  talepAcabilirMi,
  uygunMasaSec,
  type MasaBilgisi,
} from "./rezervasyon-talebi";

const SAATLER = saatleriCoz(
  "pazartesi:09:00-23:00,sali:09:00-23:00,carsamba:09:00-23:00," +
    "persembe:09:00-23:00,cuma:09:00-23:00,cumartesi:09:00-23:00,pazar:kapali",
);

const MASALAR: MasaBilgisi[] = [
  { id: "m2", kapasite: 2, aktif: true },
  { id: "m4", kapasite: 4, aktif: true },
  { id: "m8", kapasite: 8, aktif: true },
  { id: "kapali", kapasite: 10, aktif: false },
];

/** 2026-09-21 pazartesi. */
const PAZARTESI = new Date(2026, 8, 21, 0, 0, 0, 0);
function saatte(saat: number, dakika = 0): Date {
  return new Date(2026, 8, 21, saat, dakika, 0, 0);
}

function rezervasyon(
  masaIdleri: string[],
  bas: Date,
  bitis: Date,
  durum = "onaylandi",
): MevcutRezervasyon {
  return { id: `r-${bas.getTime()}`, baslangic: bas, bitis, durum, masaIdleri };
}

describe("kisiSayisiCoz", () => {
  it("geçerli sayıyı kabul eder", () => {
    expect(kisiSayisiCoz(4)).toEqual({ ok: true, deger: 4 });
    expect(kisiSayisiCoz("2")).toEqual({ ok: true, deger: 2 });
  });

  it("sıfır, ondalık ve çöp değeri reddeder", () => {
    expect(kisiSayisiCoz(0).ok).toBe(false);
    expect(kisiSayisiCoz(2.5).ok).toBe(false);
    expect(kisiSayisiCoz("iki").ok).toBe(false);
    expect(kisiSayisiCoz(undefined).ok).toBe(false);
  });

  it("büyük grubu mekana yönlendirir", () => {
    const sonuc = kisiSayisiCoz(EN_COK_KISI + 1);
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("mekanı arayın");
  });
});

describe("baslangicCoz", () => {
  const simdi = saatte(12);

  it("bir saat sonrasını kabul eder", () => {
    const sonuc = baslangicCoz(saatte(19).toISOString(), simdi);
    expect(sonuc.ok).toBe(true);
  });

  it("çok yakın saati reddeder — mekanın onaya vakti kalmıyor", () => {
    expect(baslangicCoz(saatte(12, 30).toISOString(), simdi).ok).toBe(false);
  });

  it("geçmişi reddeder", () => {
    expect(baslangicCoz(saatte(9).toISOString(), simdi).ok).toBe(false);
  });

  it("30 günden uzağı reddeder", () => {
    const uzak = new Date(simdi.getTime() + 31 * 24 * 60 * 60 * 1000);
    expect(baslangicCoz(uzak.toISOString(), simdi).ok).toBe(false);
  });

  it("okunamayan değeri reddeder", () => {
    expect(baslangicCoz("yarın akşam", simdi).ok).toBe(false);
    expect(baslangicCoz(null, simdi).ok).toBe(false);
  });
});

describe("talepAcabilirMi", () => {
  it("sınırın altında izin verir", () => {
    expect(talepAcabilirMi(EN_COK_ACIK_TALEP - 1).izin).toBe(true);
  });

  it("sınırda durdurur", () => {
    expect(talepAcabilirMi(EN_COK_ACIK_TALEP).izin).toBe(false);
  });
});

describe("uygunMasaSec", () => {
  const aralik = { baslangic: saatte(19), bitis: saatte(21) };

  it("en küçük yeterli masayı seçer", () => {
    expect(uygunMasaSec(MASALAR, 2, aralik, [])).toBe("m2");
    expect(uygunMasaSec(MASALAR, 3, aralik, [])).toBe("m4");
  });

  it("kapalı masayı hiç değerlendirmez", () => {
    expect(uygunMasaSec(MASALAR, 10, aralik, [])).toBeNull();
  });

  it("dolu masayı atlayıp bir üstünü verir", () => {
    const dolu = [rezervasyon(["m2"], saatte(19), saatte(21))];
    expect(uygunMasaSec(MASALAR, 2, aralik, dolu)).toBe("m4");
  });

  it("temizlik payı içindeki rezervasyonu da dolu sayar", () => {
    // 21:00'de biten kayıt, 21:05 başlangıcını 15 dakikalık payla engeller.
    const dolu = [rezervasyon(["m2"], saatte(19), saatte(21))];
    const bitisik = { baslangic: saatte(21, 5), bitis: saatte(23) };
    expect(uygunMasaSec(MASALAR, 2, bitisik, dolu)).toBe("m4");
  });

  it("iptal edilmiş kayıt masayı meşgul etmez", () => {
    const iptal = [rezervasyon(["m2"], saatte(19), saatte(21), "iptal")];
    expect(uygunMasaSec(MASALAR, 2, aralik, iptal)).toBe("m2");
  });

  it("hepsi doluysa null döner", () => {
    const dolu = [rezervasyon(["m2", "m4", "m8"], saatte(19), saatte(21))];
    expect(uygunMasaSec(MASALAR, 2, aralik, dolu)).toBeNull();
  });
});

describe("musaitSaatler", () => {
  const temel = {
    saatler: SAATLER,
    masalar: MASALAR,
    mevcutlar: [] as MevcutRezervasyon[],
    gun: PAZARTESI,
    kisiSayisi: 2,
    simdi: saatte(8),
  };

  it("açılış ve kapanış arasını yarım saatlik adımlarla verir", () => {
    const saatler = musaitSaatler(temel);
    expect(saatler[0].etiket).toBe("09:00");
    // 2 saatlik oturum 23:00'te bitmeli: son başlangıç 21:00.
    expect(saatler[saatler.length - 1].etiket).toBe("21:00");
    expect(saatler.map((s) => s.etiket)).toContain("19:30");
  });

  it("kapanışa sığmayan saatleri elemiş olur", () => {
    const etiketler = musaitSaatler(temel).map((s) => s.etiket);
    expect(etiketler).not.toContain("21:30");
    expect(etiketler).not.toContain("22:00");
  });

  it("kapalı günde hiç saat vermez", () => {
    const pazar = new Date(2026, 8, 27, 0, 0, 0, 0);
    const sonuc = musaitSaatler({
      ...temel,
      gun: pazar,
      simdi: new Date(2026, 8, 27, 8, 0, 0, 0),
    });
    expect(sonuc).toHaveLength(0);
  });

  it("geçmiş ve çok yakın saatleri düşürür", () => {
    const etiketler = musaitSaatler({ ...temel, simdi: saatte(18, 10) }).map(
      (s) => s.etiket,
    );
    expect(etiketler).not.toContain("18:00");
    expect(etiketler).not.toContain("19:00"); // 60 dakikalık sınırın içinde
    expect(etiketler).toContain("19:30");
  });

  it("tüm masalar doluyken o saati göstermez", () => {
    const mevcutlar = [rezervasyon(["m2", "m4", "m8"], saatte(19), saatte(21))];
    const etiketler = musaitSaatler({ ...temel, mevcutlar }).map((s) => s.etiket);
    expect(etiketler).not.toContain("19:00");
    expect(etiketler).not.toContain("20:00");
    expect(etiketler).toContain("09:00");
  });

  it("gruba göre süzüyor: dört kişilik masa doluyken iki kişi yine yer buluyor", () => {
    const mevcutlar = [rezervasyon(["m4", "m8"], saatte(19), saatte(21))];
    const iki = musaitSaatler({ ...temel, mevcutlar, kisiSayisi: 2 });
    const dort = musaitSaatler({ ...temel, mevcutlar, kisiSayisi: 4 });
    expect(iki.map((s) => s.etiket)).toContain("19:00");
    expect(dort.map((s) => s.etiket)).not.toContain("19:00");
  });

  it("gece yarısını geçen kapanışta gece saatlerini de verir", () => {
    const bar = saatleriCoz("pazartesi:20:00-02:00");
    const etiketler = musaitSaatler({
      ...temel,
      saatler: bar,
      simdi: saatte(12),
    }).map((s) => s.etiket);
    expect(etiketler).toContain("20:00");
    expect(etiketler).toContain("00:00");
    // 02:00'de kapanıyorsa 2 saatlik son oturum 00:00'da başlar.
    expect(etiketler).not.toContain("01:00");
  });
});

describe("iptalEdilebilirMi", () => {
  const simdi = saatte(12);

  it("bekleyen ve onaylanan gelecek rezervasyon iptal edilebilir", () => {
    expect(iptalEdilebilirMi({ durum: "bekliyor", baslangic: saatte(20) }, simdi).izin).toBe(
      true,
    );
    expect(iptalEdilebilirMi({ durum: "onaylandi", baslangic: saatte(20) }, simdi).izin).toBe(
      true,
    );
  });

  it("başlamış rezervasyon uygulamadan iptal edilemez", () => {
    expect(iptalEdilebilirMi({ durum: "onaylandi", baslangic: saatte(11) }, simdi).izin).toBe(
      false,
    );
  });

  it("masaya oturulmuş kaydı serbest bırakmaz", () => {
    expect(iptalEdilebilirMi({ durum: "oturdu", baslangic: saatte(20) }, simdi).izin).toBe(
      false,
    );
  });

  it("iki kez iptal denemesini ayırt eder", () => {
    const sonuc = iptalEdilebilirMi({ durum: "iptal", baslangic: saatte(20) }, simdi);
    expect(sonuc.izin).toBe(false);
    if (!sonuc.izin) expect(sonuc.mesaj).toContain("zaten");
  });
});
