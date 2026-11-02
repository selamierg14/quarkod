import { describe, expect, it } from "vitest";
import {
  DURUM_METNI,
  EN_COK_IP,
  EN_KISA_ARALIK_SN,
  calisilanDakika,
  duzeltilmesiGerekenler,
  duzeltmeGecerliMi,
  gunlukTablo,
  ipGirdisiniSadelestir,
  ipIzinliMi,
  ipListesiniDogrula,
  ipleriCoz,
  ipleriYaz,
  okutmaKarari,
  sureMetni,
} from "./mesai";

const IZINLI = ["85.105.10.42", "85.105.11."];

function saat(s: number, dk = 0): Date {
  return new Date(2026, 8, 23, s, dk, 0, 0);
}

describe("ipleriCoz / ipleriYaz", () => {
  it("virgüllü listeyi ayrıştırır, boşlukları atar", () => {
    expect(ipleriCoz(" 1.2.3.4 , 5.6.7. ,, ")).toEqual(["1.2.3.4", "5.6.7."]);
  });

  it("boş değerde boş liste", () => {
    expect(ipleriCoz(null)).toEqual([]);
    expect(ipleriCoz("")).toEqual([]);
  });

  it("yazarken tekrarları ve boşları ayıklar", () => {
    expect(ipleriYaz(["1.2.3.4", " 1.2.3.4 ", ""])).toBe("1.2.3.4");
    expect(ipleriYaz([])).toBeNull();
  });
});

describe("ipIzinliMi", () => {
  it("tam eşleşmeyi kabul eder", () => {
    expect(ipIzinliMi(IZINLI, "85.105.10.42")).toBe(true);
  });

  it("nokta ile biten değeri ÖNEK sayar — dinamik IP'de blok kabulü", () => {
    expect(ipIzinliMi(IZINLI, "85.105.11.7")).toBe(true);
    expect(ipIzinliMi(IZINLI, "85.105.11.250")).toBe(true);
  });

  it("blok dışındaki adresi reddeder", () => {
    expect(ipIzinliMi(IZINLI, "85.105.12.7")).toBe(false);
    expect(ipIzinliMi(IZINLI, "78.180.4.4")).toBe(false);
  });

  /**
   * ÖNEK TUZAĞI KAPALI ve bunu sağlayan şey sondaki nokta.
   *
   * Düz metin öneki kullanan sistemlerin klasik hatası: "85.105.11"
   * yazıldığında 85.105.110.5 (bambaşka bir blok) da eşleşir. Burada
   * önekin nokta ile bitmesi zorunlu olduğu için 85.105.110.5'in
   * onuncu karakteri "." değil "0" ve eşleşme olmuyor.
   */
  it("komşu blok önekten sızmıyor: 85.105.11. ≠ 85.105.110.5", () => {
    expect(ipIzinliMi(IZINLI, "85.105.110.5")).toBe(false);
    expect(ipIzinliMi(IZINLI, "85.105.11.5")).toBe(true);
  });

  it("liste boşken hiçbir şey geçmiyor", () => {
    expect(ipIzinliMi([], "85.105.10.42")).toBe(false);
  });

  it("güvenilmez IP hiçbir koşulda geçmiyor", () => {
    expect(ipIzinliMi(IZINLI, "guvenilmez")).toBe(false);
    expect(ipIzinliMi(["guvenilmez"], "guvenilmez")).toBe(false);
  });

  it("büyük/küçük harf farkı IPv6'da sorun çıkarmıyor", () => {
    expect(ipIzinliMi(["2a02:ff0:"], "2A02:FF0:1234::9")).toBe(true);
  });
});

describe("ipIzinliMi — IPv6 ve eşlenmiş IPv4", () => {
  it("aynı IPv6 adresinin farklı yazımları eşleşiyor", () => {
    expect(ipIzinliMi(["2a02:ff0:0:0:0:0:0:1"], "2a02:ff0::1")).toBe(true);
    expect(ipIzinliMi(["2a02:ff0::1"], "2A02:0FF0:0000:0000:0000:0000:0000:0001")).toBe(true);
    expect(ipIzinliMi(["2a02:ff0::1"], "2a02:ff0::2")).toBe(false);
  });

  it("IPv6 öneki, sıkıştırılmış gelen adreste de çalışıyor", () => {
    // Gelen adres sıfır grupları "::" ile yutuyor; önek metin olarak
    // karşılaştırılsaydı eşleşmezdi.
    expect(ipIzinliMi(["2a02:ff0:0:0:"], "2a02:ff0::9")).toBe(true);
    expect(ipIzinliMi(["2a02:ff0:0:0:"], "2a02:ff0:0:1::9")).toBe(false);
  });

  it("vekilin ::ffff: biçimindeki IPv4'ü düz IPv4 listesiyle eşleşiyor", () => {
    expect(ipIzinliMi(IZINLI, "::ffff:85.105.10.42")).toBe(true);
    expect(ipIzinliMi(IZINLI, "::ffff:85.105.11.9")).toBe(true);
    expect(ipIzinliMi(IZINLI, "::ffff:78.180.4.4")).toBe(false);
  });

  it("çözülemeyen gelen adres hiçbir koşulda geçmiyor", () => {
    expect(ipIzinliMi(IZINLI, "85.105.10.42, 1.1.1.1")).toBe(false);
    expect(ipIzinliMi(IZINLI, "bilinmiyor")).toBe(false);
  });
});

describe("ipGirdisiniSadelestir", () => {
  it("tam IPv4 ve /24 bloğunu kabul ediyor", () => {
    expect(ipGirdisiniSadelestir(" 85.105.10.42 ")).toEqual({ ok: true, deger: "85.105.10.42" });
    expect(ipGirdisiniSadelestir("85.105.11.")).toEqual({ ok: true, deger: "85.105.11." });
  });

  /**
   * Korumanın kendisi. "85." 16 milyon, "85.105." 65 bin adres demek;
   * mesai kaydının tek kanıtı IP olduğu için bunlar korumayı fiilen
   * kaldırırdı.
   */
  it("geniş blokları reddediyor", () => {
    expect(ipGirdisiniSadelestir("85.").ok).toBe(false);
    expect(ipGirdisiniSadelestir("85.105.").ok).toBe(false);
    expect(ipGirdisiniSadelestir("2a02:ff0:").ok).toBe(false);
  });

  it("bozuk IPv4'ü reddediyor", () => {
    for (const kotu of ["256.1.1.1", "1.2.3", "1.2.3.4.5", "01.2.3.4", "1.2.3.4.", "abc", "1.2.3.-4"]) {
      expect(ipGirdisiniSadelestir(kotu).ok, kotu).toBe(false);
    }
  });

  it("IPv6'yı açılmış biçimde saklıyor", () => {
    expect(ipGirdisiniSadelestir("2A02:FF0::1")).toEqual({
      ok: true,
      deger: "2a02:ff0:0:0:0:0:0:1",
    });
    expect(ipGirdisiniSadelestir("2a02:0ff0:0012:0034:")).toEqual({
      ok: true,
      deger: "2a02:ff0:12:34:",
    });
  });

  it("bozuk IPv6'yı reddediyor", () => {
    for (const kotu of ["2a02::ff0::1", "2a02:ff0:12345::1", "gggg::1", "1:2:3:4:5:6:7:8:9"]) {
      expect(ipGirdisiniSadelestir(kotu).ok, kotu).toBe(false);
    }
  });

  it("::ffff: biçimini düz IPv4'e çeviriyor", () => {
    expect(ipGirdisiniSadelestir("::ffff:85.105.10.42")).toEqual({
      ok: true,
      deger: "85.105.10.42",
    });
  });
});

describe("ipListesiniDogrula", () => {
  it("virgül, boşluk, noktalı virgül ve satır sonuyla ayrılmış listeyi okuyor", () => {
    expect(ipListesiniDogrula("85.105.10.42 85.105.10.43\n85.105.11.;1.2.3.4,5.6.7.8")).toEqual({
      ok: true,
      ipler: ["85.105.10.42", "85.105.10.43", "85.105.11.", "1.2.3.4", "5.6.7.8"],
    });
  });

  it("tekrarları ayıklıyor, IPv6 yazım farklarını aynı sayıyor", () => {
    expect(ipListesiniDogrula("1.2.3.4, 1.2.3.4, 2a02:ff0::1, 2a02:ff0:0::1")).toEqual({
      ok: true,
      ipler: ["1.2.3.4", "2a02:ff0:0:0:0:0:0:1"],
    });
  });

  it("boş liste geçerli (listeyi temizlemek)", () => {
    expect(ipListesiniDogrula("")).toEqual({ ok: true, ipler: [] });
    expect(ipListesiniDogrula("  \n ,, ")).toEqual({ ok: true, ipler: [] });
    expect(ipListesiniDogrula(null)).toEqual({ ok: true, ipler: [] });
  });

  it("tek bir hatalı değer bütün listeyi durduruyor ve hatalıyı söylüyor", () => {
    const sonuc = ipListesiniDogrula("85.105.10.42, 85.");
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain('"85."');
  });

  it("çok sayıda hatada ilk üçünü sayıp kalanını özetliyor", () => {
    const sonuc = ipListesiniDogrula("a b c d e");
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("ve 2 değer daha");
  });

  it(`en fazla ${EN_COK_IP} kayıt`, () => {
    const yirmi = Array.from({ length: EN_COK_IP }, (_, i) => `10.0.0.${i + 1}`).join(" ");
    expect(ipListesiniDogrula(yirmi).ok).toBe(true);
    expect(ipListesiniDogrula(`${yirmi} 10.0.0.99`).ok).toBe(false);
  });

  it("aşırı uzun girdiyi işlemeden reddediyor", () => {
    expect(ipListesiniDogrula("1".repeat(2001)).ok).toBe(false);
  });
});

describe("okutmaKarari", () => {
  const temel = { izinliIpler: IZINLI, ip: "85.105.10.42", acikKayit: null };

  it("kurulum yapılmamışsa reddeder", () => {
    const k = okutmaKarari({ ...temel, izinliIpler: [] });
    expect(k.sonuc).toBe("red");
    if (k.sonuc === "red") expect(k.neden).toBe("kurulum-eksik");
  });

  it("IP tespit edilemiyorsa reddeder — sahte güvenlik yok", () => {
    const k = okutmaKarari({ ...temel, ip: "guvenilmez" });
    expect(k.sonuc).toBe("red");
    if (k.sonuc === "red") expect(k.neden).toBe("ip-tespit-edilemiyor");
  });

  it("dışarıdan gelen isteği reddeder ve ne yapacağını söyler", () => {
    const k = okutmaKarari({ ...temel, ip: "78.180.4.4" });
    expect(k.sonuc).toBe("red");
    if (k.sonuc === "red") {
      expect(k.neden).toBe("ip-disarida");
      expect(k.mesaj).toContain("Wi-Fi");
    }
  });

  it("açık kaydı yoksa GİRİŞ", () => {
    expect(okutmaKarari(temel).sonuc).toBe("giris");
  });

  it("açık kaydı varsa ÇIKIŞ ve süreyi hesaplar", () => {
    const k = okutmaKarari({
      ...temel,
      acikKayit: { id: "k1", userId: "u1", giris: saat(9), cikis: null },
      simdi: saat(17, 30),
    });
    expect(k.sonuc).toBe("cikis");
    if (k.sonuc === "cikis") {
      expect(k.kayitId).toBe("k1");
      expect(k.calisilanDakika).toBe(510);
    }
  });

  it("çift okutma girişi hemen kapatmıyor", () => {
    const k = okutmaKarari({
      ...temel,
      acikKayit: { id: "k1", userId: "u1", giris: saat(9), cikis: null },
      simdi: new Date(saat(9).getTime() + (EN_KISA_ARALIK_SN - 5) * 1000),
    });
    expect(k.sonuc).toBe("red");
    if (k.sonuc === "red") expect(k.neden).toBe("cok-hizli");
  });
});

describe("calisilanDakika / sureMetni", () => {
  it("açık kayıtta süre yok — tahmin üretilmiyor", () => {
    expect(calisilanDakika({ id: "1", userId: "u", giris: saat(9), cikis: null })).toBeNull();
    expect(sureMetni(null)).toBe("—");
  });

  it("kapalı kaydın süresini dakika olarak verir", () => {
    expect(calisilanDakika({ id: "1", userId: "u", giris: saat(9), cikis: saat(17, 15) })).toBe(495);
  });

  it("okunur metne çevirir", () => {
    expect(sureMetni(495)).toBe("8s 15dk");
    expect(sureMetni(480)).toBe("8s");
    expect(sureMetni(45)).toBe("45dk");
  });
});

describe("gunlukTablo", () => {
  const plan = [{ userId: "u1", ad: "Ali", vardiya: "aksam" }, { userId: "u2", ad: "Ayşe", vardiya: "sabah" }];

  it("planı olup hiç okutmayan 'giriş yapmadı' oluyor", () => {
    const t = gunlukTablo({ kayitlar: [], planlananlar: plan, gunBitti: true });
    expect(t.map((s) => s.durum)).toEqual(["Ali", "Ayşe"].map(() => "giris-yapmadi"));
  });

  it("açık kayıt gün içinde 'içeride', gün bitince 'çıkış yapmadı'", () => {
    const kayit = [{ id: "k", userId: "u1", ad: "Ali", giris: saat(16), cikis: null }];
    expect(gunlukTablo({ kayitlar: kayit, planlananlar: plan, gunBitti: false })
      .find((s) => s.userId === "u1")?.durum).toBe("icerde");
    expect(gunlukTablo({ kayitlar: kayit, planlananlar: plan, gunBitti: true })
      .find((s) => s.userId === "u1")?.durum).toBe("cikis-yapmadi");
  });

  it("aynı gün iki kayıt toplanıyor, uçlar ilk giriş ve son çıkış", () => {
    const kayitlar = [
      { id: "a", userId: "u1", ad: "Ali", giris: saat(9), cikis: saat(12) },
      { id: "b", userId: "u1", ad: "Ali", giris: saat(13), cikis: saat(17) },
    ];
    const satir = gunlukTablo({ kayitlar, planlananlar: plan, gunBitti: true })
      .find((s) => s.userId === "u1")!;
    expect(satir.toplamDakika).toBe(420);
    expect(satir.ilkGiris).toEqual(saat(9));
    expect(satir.sonCikis).toEqual(saat(17));
    expect(satir.kayitSayisi).toBe(2);
    expect(satir.durum).toBe("tamam");
  });

  it("planı olmayan ama gelen kişi de tabloda", () => {
    const kayitlar = [{ id: "c", userId: "u9", ad: "Zeynep", giris: saat(10), cikis: saat(14) }];
    const satir = gunlukTablo({ kayitlar, planlananlar: plan, gunBitti: true })
      .find((s) => s.userId === "u9");
    expect(satir).toBeDefined();
    expect(satir?.vardiya).toBeNull();
  });

  it("ada göre Türkçe sıralı", () => {
    const t = gunlukTablo({
      kayitlar: [{ id: "c", userId: "u9", ad: "Çağla", giris: saat(10), cikis: saat(14) }],
      planlananlar: plan,
      gunBitti: true,
    });
    expect(t.map((s) => s.ad)).toEqual(["Ali", "Ayşe", "Çağla"]);
  });
});

describe("duzeltilmesiGerekenler", () => {
  it("yalnızca eksik satırları veriyor", () => {
    const t = gunlukTablo({
      kayitlar: [
        { id: "a", userId: "u1", ad: "Ali", giris: saat(9), cikis: saat(17) },
        { id: "b", userId: "u3", ad: "Can", giris: saat(9), cikis: null },
      ],
      planlananlar: [{ userId: "u2", ad: "Ayşe", vardiya: "sabah" }],
      gunBitti: true,
    });
    expect(duzeltilmesiGerekenler(t).map((s) => s.ad).sort()).toEqual(["Ayşe", "Can"]);
  });
});

describe("duzeltmeGecerliMi", () => {
  it("açık bırakmaya izin veriyor", () => {
    expect(duzeltmeGecerliMi(saat(9), null).ok).toBe(true);
  });

  it("çıkış girişten önce olamaz", () => {
    expect(duzeltmeGecerliMi(saat(17), saat(9)).ok).toBe(false);
    expect(duzeltmeGecerliMi(saat(9), saat(9)).ok).toBe(false);
  });

  it("24 saati aşan kaydı durduruyor — yanlış gün seçimi", () => {
    const sonuc = duzeltmeGecerliMi(saat(9), new Date(2026, 8, 25, 10));
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("24 saatten");
  });

  it("geçersiz tarihi reddeder", () => {
    expect(duzeltmeGecerliMi(new Date("çöp"), null).ok).toBe(false);
  });
});

describe("DURUM_METNI", () => {
  it("her durum için Türkçe karşılık var", () => {
    expect(Object.values(DURUM_METNI).every((m) => m.length > 0)).toBe(true);
    expect(DURUM_METNI["cikis-yapmadi"]).toBe("Çıkış yapmadı");
  });
});
