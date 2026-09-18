import { describe, it, expect } from "vitest";
import { kayitSorunu, denemeBitisi, DENEME_GUN, type KayitGirdisi } from "./deneme";

/**
 * Ücretsiz deneme kaydı, projedeki TEK kimlik doğrulaması istemeyen yazma
 * yüzeyi: internetteki herkes bu formu gönderip veritabanında hesap,
 * işletme ve kullanıcı kaydı açtırabiliyor. Doğrulamasının en sıkı olması
 * gereken yer burası.
 *
 * Test dosyası yoktu; kural değişirse (ör. sınırlar gevşerse) kimse fark
 * etmezdi.
 */

const GECERLI: KayitGirdisi = {
  firma: "Ada Kahvesi",
  adSoyad: "Şükrü Öztürk",
  eposta: "sukru@adakahvesi.com",
  telefon: "05321234567",
  kullaniciAdi: "",
  sifre: "dogru-at-pil-zimba",
  kvkkOnay: true,
};

/** Geçerli kaydın tek alanını değiştirip sonucu döndürür. */
function ile(degisiklik: Partial<KayitGirdisi>): string | null {
  return kayitSorunu({ ...GECERLI, ...degisiklik });
}

describe("kayitSorunu", () => {
  it("geçerli kayıt kabul ediliyor", () => {
    expect(kayitSorunu(GECERLI)).toBeNull();
  });

  describe("üst sınırlar", () => {
    /**
     * ÜST SINIR bu formda alt sınırdan daha önemli: alanların hiçbirinde
     * yoktu ve değerler doğrudan veritabanına gidiyordu. Kimlik istemeyen
     * bir uçta sınırsız metin, tek istekle depolamayı şişirmenin en ucuz
     * yolu.
     */
    it("işletme adı 80 karakteri aşamaz", () => {
      expect(ile({ firma: "a".repeat(80) })).toBeNull();
      expect(ile({ firma: "a".repeat(81) })).not.toBeNull();
    });

    it("ad soyad 80 karakteri aşamaz", () => {
      expect(ile({ adSoyad: "a".repeat(81) })).not.toBeNull();
    });

    it("e-posta 254 karakteri aşamaz", () => {
      // RFC 5321'in adres uzunluğu üst sınırı.
      const uzun = `${"a".repeat(250)}@x.com`;
      expect(ile({ eposta: uzun })).not.toBeNull();
    });

    it("şifre 128 karakteri aşamaz", () => {
      // bcrypt maliyeti girdiyle artıyor; sınır bir DoS savunması.
      expect(ile({ sifre: "a".repeat(128) })).toBeNull();
      expect(ile({ sifre: "a".repeat(129) })).not.toBeNull();
    });
  });

  describe("alt sınırlar ve biçim", () => {
    it("tek harflik işletme adı reddediliyor", () => {
      expect(ile({ firma: "A" })).not.toBeNull();
    });

    it("boş alanlar reddediliyor", () => {
      expect(ile({ firma: "" })).not.toBeNull();
      expect(ile({ adSoyad: "" })).not.toBeNull();
      expect(ile({ eposta: "" })).not.toBeNull();
      expect(ile({ telefon: "" })).not.toBeNull();
    });

    it("biçimsiz e-posta reddediliyor", () => {
      for (const kotu of ["ad@ornek", "@ornek.com", "ad ornek@x.com", "düz metin"]) {
        expect(ile({ eposta: kotu }), kotu).not.toBeNull();
      }
    });

    it("yalnızca rakamdan oluşan şifre reddediliyor", () => {
      // Kural sifre.ts'te; buradan geçtiğini doğruluyoruz.
      expect(ile({ sifre: "123456789" })).not.toBeNull();
    });

    it("KVKK onayı olmadan kayıt açılamıyor", () => {
      // Rıza olmadan iletişim bilgisi saklanamaz; kaydın kendisi o bilgiye
      // dayandığı için bu kutu isteğe bağlı değil.
      expect(ile({ kvkkOnay: false })).not.toBeNull();
    });
  });

  it("Türkçe adlar reddedilmiyor", () => {
    // Ad alanında yanlış pozitif en pahalı hata: kullanıcı kendi adını
    // yazamıyor ve bunu destek talebi olarak öğreniyoruz.
    for (const ad of ["Şükrü Öztürk", "Ayşe Nur Çağlayan", "Ahmet B.", "O'Brien"]) {
      expect(ile({ adSoyad: ad }), ad).toBeNull();
    }
  });

  it("hata mesajı hangi alanın sorunlu olduğunu söylüyor", () => {
    expect(ile({ eposta: "bozuk" })).toContain("E-posta");
    expect(ile({ firma: "" })).toContain("İşletme adı");
  });
});

describe("denemeBitisi", () => {
  it("bitiş günü dahil, gün sonunda", () => {
    const simdi = new Date("2026-03-10T09:15:00Z");
    const bitis = denemeBitisi(simdi);
    expect(bitis.getHours()).toBe(23);
    expect(bitis.getMinutes()).toBe(59);
  });

  it("tam DENEME_GUN kadar ileri gidiyor", () => {
    const simdi = new Date("2026-03-10T09:15:00");
    const bitis = denemeBitisi(simdi);
    const gunFarki = Math.round(
      (bitis.getTime() - new Date(simdi).setHours(23, 59, 59, 999)) / 86_400_000,
    );
    expect(gunFarki).toBe(DENEME_GUN);
  });
});
