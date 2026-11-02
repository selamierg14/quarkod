import { describe, it, expect } from "vitest";
import {
  GUNLER,
  acikMi,
  araligaUygunMu,
  bosSaatler,
  dakikayaCevir,
  gunIndeksi,
  saatTanimliMi,
  saatleriCoz,
  saatleriYaz,
  type CalismaSaatleri,
} from "./calisma-saati";

/**
 * Bu kuralın iki tüketicisi olacak — rezervasyon ve etkinlik — ve ikisi de
 * "o saatte açık mı" sorusunun cevabına göre kayıt yazacak. Buradaki bir
 * hata, kapalı bir mekana rezervasyon alınması demek.
 *
 * En kritik dal gece yarısını geçen kapanış: bir bar için "20:00–02:00"
 * istisna değil kural, ve saat 01:00'de "kapalı" demek o mekanı en yoğun
 * saatinde listeden düşürmek olur.
 */

/** Okunabilir kısayol: yalnızca verilen günler açık. */
function saatler(tanim: Partial<Record<(typeof GUNLER)[number], string>>): CalismaSaatleri {
  const s = bosSaatler();
  for (const [gun, aralik] of Object.entries(tanim)) {
    const [acilis, kapanis] = (aralik as string).split("-");
    s[gun as (typeof GUNLER)[number]] = { kapali: false, acilis, kapanis };
  }
  return s;
}

/** 2026-09-14 pazartesi. Testlerin tamamı bu haftadan. */
const PZT = (saat: string) => new Date(`2026-09-14T${saat}:00`);
const SALI = (saat: string) => new Date(`2026-09-15T${saat}:00`);
const PAZAR = (saat: string) => new Date(`2026-09-20T${saat}:00`);

describe("gunIndeksi", () => {
  it("pazartesiyi 0, pazarı 6 sayıyor", () => {
    // JS'te pazar 0; bu dönüşüm atlanırsa bütün hafta bir gün kayar.
    expect(gunIndeksi(PZT("12:00"))).toBe(0);
    expect(gunIndeksi(SALI("12:00"))).toBe(1);
    expect(gunIndeksi(PAZAR("12:00"))).toBe(6);
  });
});

describe("dakikayaCevir", () => {
  it("geçerli saatleri çeviriyor", () => {
    expect(dakikayaCevir("00:00")).toBe(0);
    expect(dakikayaCevir("09:30")).toBe(570);
    expect(dakikayaCevir("23:59")).toBe(1439);
  });

  it("geçersiz biçimi reddediyor", () => {
    for (const kotu of ["24:00", "9:00", "09:60", "0900", "", "abc", "-1:00"]) {
      expect(dakikayaCevir(kotu), kotu).toBeNull();
    }
  });
});

describe("çöz / yaz", () => {
  it("yazılanı geri okuyor", () => {
    const asil = saatler({ pazartesi: "09:00-23:00", cumartesi: "10:00-02:00" });
    expect(saatleriCoz(saatleriYaz(asil))).toEqual(asil);
  });

  it("hiç gün açık değilse null yazıyor", () => {
    // Boş sütun "tanımlanmamış" demek; "hepsi kapalı" ile aynı şey.
    expect(saatleriYaz(bosSaatler())).toBeNull();
  });

  it("boş/bozuk girdide çökmüyor", () => {
    for (const ham of [null, undefined, "", "   ", "saçma", "pazartesi", ",,,"]) {
      expect(() => saatleriCoz(ham)).not.toThrow();
      expect(saatTanimliMi(saatleriCoz(ham)), String(ham)).toBe(false);
    }
  });

  it("bozuk bir gün diğerlerini düşürmüyor", () => {
    // Tek hatalı parça yüzünden bütün haftayı kaybetmenin anlamı yok.
    const cozulen = saatleriCoz("pazartesi:09:00-23:00,sali:BOZUK,carsamba:10:00-20:00");
    expect(cozulen.pazartesi).toEqual({ kapali: false, acilis: "09:00", kapanis: "23:00" });
    expect(cozulen.sali).toEqual({ kapali: true });
    expect(cozulen.carsamba).toEqual({ kapali: false, acilis: "10:00", kapanis: "20:00" });
  });

  it("listede olmayan gün KAPALI sayılıyor", () => {
    // Eksik veriyi "açık" varsaymak, kullanıcıyı kapalı mekana göndermek.
    expect(saatleriCoz("pazartesi:09:00-23:00").pazar).toEqual({ kapali: true });
  });

  it("açılış ile kapanış aynıysa kapalı sayılıyor", () => {
    expect(saatleriCoz("pazartesi:09:00-09:00").pazartesi).toEqual({ kapali: true });
  });

  it("tanınmayan gün adı yok sayılıyor", () => {
    expect(saatTanimliMi(saatleriCoz("monday:09:00-23:00"))).toBe(false);
  });
});

describe("acikMi", () => {
  it("saat tanımlı değilse 'bilinmiyor' — 'kapalı' DEĞİL", () => {
    // Fark önemli: arayüz "kapalı" yazarsa yalan söylemiş olur.
    expect(acikMi(bosSaatler(), PZT("12:00"))).toEqual({ durum: "bilinmiyor" });
  });

  it("normal mesai içinde açık", () => {
    const s = saatler({ pazartesi: "09:00-23:00" });
    const sonuc = acikMi(s, PZT("12:00"));
    expect(sonuc.durum).toBe("acik");
    if (sonuc.durum === "acik") expect(sonuc.kapanisDakika).toBe(11 * 60);
  });

  it("açılış anında açık, kapanış anında kapalı", () => {
    // Sınırlar: kapanış saatinde "hâlâ açık" demek kapıda kalmaya yol açar.
    const s = saatler({ pazartesi: "09:00-23:00" });
    expect(acikMi(s, PZT("09:00")).durum).toBe("acik");
    expect(acikMi(s, PZT("22:59")).durum).toBe("acik");
    expect(acikMi(s, PZT("23:00")).durum).toBe("kapali");
    expect(acikMi(s, PZT("08:59")).durum).toBe("kapali");
  });

  describe("gece yarısını geçen kapanış", () => {
    const bar = saatler({ pazartesi: "20:00-02:00" });

    it("açılıştan sonra aynı gün açık", () => {
      expect(acikMi(bar, PZT("23:00")).durum).toBe("acik");
    });

    it("gece yarısından SONRA hâlâ açık", () => {
      // Bu dal atlanırsa bütün barlar en yoğun saatinde kapalı görünür.
      const sonuc = acikMi(bar, SALI("01:00"));
      expect(sonuc.durum).toBe("acik");
      if (sonuc.durum === "acik") expect(sonuc.kapanisDakika).toBe(60);
    });

    it("kapanıştan sonra kapalı", () => {
      expect(acikMi(bar, SALI("02:01")).durum).toBe("kapali");
      expect(acikMi(bar, SALI("10:00")).durum).toBe("kapali");
    });

    it("açılıştan önce kapalı", () => {
      expect(acikMi(bar, PZT("19:59")).durum).toBe("kapali");
    });
  });

  describe("sonraki açılış", () => {
    it("bugünün açılışı henüz gelmediyse bugünü söylüyor", () => {
      // Sabah 07:00'de bakan kişiye "yarın" demek yanlış olur.
      const s = saatler({ pazartesi: "09:00-23:00" });
      const sonuc = acikMi(s, PZT("07:00"));
      expect(sonuc.durum).toBe("kapali");
      if (sonuc.durum === "kapali") {
        expect(sonuc.sonrakiAcilis).toEqual({ gun: "pazartesi", saat: "09:00" });
      }
    });

    it("bugün geçtiyse sonraki açık günü buluyor", () => {
      const s = saatler({ pazartesi: "09:00-17:00", persembe: "10:00-20:00" });
      const sonuc = acikMi(s, PZT("18:00"));
      if (sonuc.durum === "kapali") {
        expect(sonuc.sonrakiAcilis).toEqual({ gun: "persembe", saat: "10:00" });
      }
    });

    it("hafta sonundan hafta başına dönebiliyor", () => {
      // Pazar akşamı bakan kişiye pazartesiyi söylemeli.
      const s = saatler({ pazartesi: "09:00-17:00" });
      const sonuc = acikMi(s, PAZAR("20:00"));
      if (sonuc.durum === "kapali") {
        expect(sonuc.sonrakiAcilis).toEqual({ gun: "pazartesi", saat: "09:00" });
      }
    });
  });
});

describe("araligaUygunMu", () => {
  const s = saatler({ pazartesi: "09:00-23:00", cumartesi: "20:00-02:00" });

  it("tamamı mesai içindeyse kabul", () => {
    expect(araligaUygunMu(s, PZT("19:00"), PZT("21:00"))).toBe(true);
  });

  it("başlangıç kapalıyken ret", () => {
    expect(araligaUygunMu(s, PZT("07:00"), PZT("09:30"))).toBe(false);
  });

  it("KAPANIŞA TAŞAN aralık reddediliyor", () => {
    /**
     * Asıl mesele bu: başlangıcın açık olması yetmiyor. Kapanışa on
     * dakika kala iki saatlik masa vermek, müşteriyi kapıda bırakmak.
     */
    expect(araligaUygunMu(s, PZT("22:30"), PZT("23:30"))).toBe(false);
    expect(araligaUygunMu(s, PZT("21:00"), PZT("23:00"))).toBe(true);
  });

  it("gece yarısını geçen aralıkta doğru hesaplıyor", () => {
    const cmt = (saat: string) => new Date(`2026-09-19T${saat}:00`);
    const pzr = (saat: string) => new Date(`2026-09-20T${saat}:00`);
    expect(araligaUygunMu(s, cmt("23:00"), pzr("01:00"))).toBe(true);
    expect(araligaUygunMu(s, cmt("23:00"), pzr("03:00"))).toBe(false);
  });

  it("ters ya da sıfır uzunlukta aralık reddediliyor", () => {
    expect(araligaUygunMu(s, PZT("21:00"), PZT("21:00"))).toBe(false);
    expect(araligaUygunMu(s, PZT("21:00"), PZT("20:00"))).toBe(false);
  });

  it("saat tanımlı değilse ENGELLEMİYOR", () => {
    // Bilinmeyen bir kısıt yüzünden işletmenin rezervasyon almasını
    // durdurmak, yanlışın pahalı yönü.
    expect(araligaUygunMu(bosSaatler(), PZT("03:00"), PZT("05:00"))).toBe(true);
  });
});
