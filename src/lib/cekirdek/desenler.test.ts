import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DESENLER,
  alanDogrula,
  alanKurali,
  alanOzellikleri,
  type AlanTuru,
} from "./desenler";

const TURLER = Object.keys(DESENLER) as AlanTuru[];

/**
 * Bu dosyanın asıl iddiası tek tek desenler değil, İKİ TARAFIN AYNI ŞEYİ
 * SÖYLEDİĞİ: tarayıcının reddettiğini sunucu da reddediyor, sunucunun
 * kabul ettiğini tarayıcı da kabul ediyor.
 *
 * Ayrışma buradaki en pahalı hata olurdu ve sessizce olurdu: arayüz gevşek
 * kalırsa kullanıcı formu gönderiyor ve sunucudan hata yiyor (rahatsız edici
 * ama zararsız); arayüz sunucudan KATI olursa kullanıcı geçerli veriyi hiç
 * gönderemiyor ve sebebini anlamıyor. İkincisi destek talebi olarak geri
 * dönene kadar fark edilmez.
 */

describe("desen kaynakları iki bayrakla da derleniyor", () => {
  /**
   * Tarayıcı `pattern` niteliğini `v` bayrağıyla derliyor, sunucu tarafı
   * `u` ile. `v` daha katı: karakter sınıfı içinde `( ) [ ] { } / - |`
   * kaçışsız yazılamıyor. Kaçışı unutulan bir desen tarayıcıda SESSİZCE
   * çalışmaz — geçersiz pattern niteliği yok sayılır ve alan doğrulamasız
   * kalır. Tam olarak fark edilmeyecek türden bir gerileme.
   */
  for (const tur of TURLER) {
    const kaynak = alanKurali(tur).desen;
    if (!kaynak) continue;

    it(`${tur} — u ve v bayrağı`, () => {
      expect(() => new RegExp(`^(?:${kaynak})$`, "u")).not.toThrow();
      expect(() => new RegExp(`^(?:${kaynak})$`, "v")).not.toThrow();
    });
  }
});

describe("arayüz ile sunucu aynı kuralı uyguluyor", () => {
  /** Tarayıcının yaptığı işin birebir taklidi. */
  function tarayiciKabulEderMi(tur: AlanTuru, deger: string): boolean {
    const o = alanOzellikleri(tur);
    if (o.required && deger.length === 0) return false;
    if (deger.length === 0) return true;
    if (o.maxLength !== undefined && deger.length > o.maxLength) return false;
    if (o.minLength !== undefined && deger.length < o.minLength) return false;
    if (o.pattern && !new RegExp(`^(?:${o.pattern})$`, "v").test(deger)) return false;
    return true;
  }

  // Her tür için: kabul edilmesi beklenen ve reddedilmesi beklenen örnekler.
  const ornekler: Record<AlanTuru, { gecerli: string[]; gecersiz: string[] }> = {
    eposta: {
      gecerli: ["ad@ornek.com", "a.b+etiket@alt.ornek.com.tr"],
      gecersiz: ["ad@ornek", "@ornek.com", "ad ornek@x.com", "ad@@ornek.com"],
    },
    kullaniciAdi: {
      // Tire kabul ediliyor: tohumlanmış hesapların çoğu tireli.
      gecerli: ["ada.kahvesi", "garson_01", "abc", "kusdili-kahvecisi.demo"],
      gecersiz: ["ab", "Buyuk.Harf", "türkçe", "boşluk var", "a@b"],
    },
    girisKimligi: {
      // Giriş alanı biçime bakmıyor — yalnızca uzunluğa.
      gecerli: ["ada.kahvesi", "kusdili-kahvecisi.demo", "ESKI_Kural"],
      gecersiz: ["", "a".repeat(65)],
    },
    telefon: {
      gecerli: ["05321234567", "0532 123 45 67", "+90 (532) 123-4567"],
      gecersiz: ["532", "0532123456a", "telefon yok"],
    },
    dogrulamaKodu: {
      gecerli: ["123456", "000000"],
      gecersiz: ["12345", "1234567", "12345a", ""],
    },
    girisSifresi: {
      // Giriş alanı asgari uzunluğu dayatmıyor — eski, kısa şifreli
      // hesaplar hâlâ girebilmeli.
      gecerli: ["kısa", "dogru-at-pil-zımba"],
      gecersiz: ["", "a".repeat(129)],
    },
    sifre: {
      // Desen YOK: parola yöneticisinin ürettiği her şey geçmeli.
      gecerli: ["dogru-at-pil-zımba", "P@$$w0rd!<>&'\"", "ãäöü şğ ıİ 12345"],
      gecersiz: ["kısa", "a".repeat(129)],
    },
    renk: {
      gecerli: ["#111827", "#FFFFFF", "#0a0B0c"],
      gecersiz: ["111827", "#fff", "#12345g", "red", "rgb(1,2,3)"],
    },
    webAdresi: {
      gecerli: ["https://maps.app.goo.gl/abc", "http://ornek.com/yol?a=1"],
      // javascript: ve data: bir bağlantı alanına HİÇ girmemeli.
      gecersiz: [
        "javascript:alert(1)",
        "data:text/html,<script>",
        "ornek.com",
        "https://bosluk var.com",
      ],
    },
    kisiAdi: {
      gecerli: [
        "Şükrü Öztürk",
        "Ahmet B.",
        "O'Brien",
        "Zeynep Nur Çağla",
        // Veritabanında gerçekten duran kayıt — ilk desen bunu reddediyordu.
        "Nefes Cafe & Bistro Sahibi",
      ],
      gecersiz: ["A", "<script>alert(1)</script>", "ad@soyad", "a".repeat(81)],
    },
    isletmeAdi: {
      gecerli: ["Ada Kahvesi", "Kafe & Fırın No:3"],
      gecersiz: ["A", "a".repeat(81)],
    },
    kisaBaslik: {
      gecerli: ["Bugüne özel %20 indirim"],
      gecersiz: ["", "a".repeat(121)],
    },
    aciklama: {
      gecerli: ["", "İki satırlık\naçıklama"],
      gecersiz: ["a".repeat(501)],
    },
    not: {
      gecerli: ["", "uzun not"],
      gecersiz: ["a".repeat(1001)],
    },
    etkinlikBasligi: {
      gecerli: ["Cumartesi kahve", "a".repeat(80)],
      // Alt sınır çöp başlığa karşı: "a" ya da "..." listeyi doldurur.
      gecersiz: ["ab", "a".repeat(81)],
    },
    etkinlikAciklamasi: {
      gecerli: ["", "Saat 20:00'de bahçe tarafındayız."],
      gecersiz: ["a".repeat(401)],
    },
    adres: {
      gecerli: ["", "Bağdat Cad. No:12, Kadıköy/İstanbul"],
      gecersiz: ["a".repeat(301)],
    },
    masaAdi: {
      gecerli: ["12", "Bahçe 3", "A-1"],
      gecersiz: ["", "a".repeat(41), "masa#1"],
    },
    wifiAdi: {
      gecerli: ["AdaKahvesi_Misafir"],
      // 32 bayt SSID standardının sınırı; daha uzunu cihazlarda çalışmaz.
      gecersiz: ["", "a".repeat(33)],
    },
    wifiSifresi: {
      gecerli: ["", "kahve12345"],
      gecersiz: ["a".repeat(64)],
    },
    iysKodu: {
      gecerli: ["123", "123456789012"],
      gecersiz: ["12", "abc123", "1234567890123"],
    },
  };

  it("her alan türü için örnek tanımlı", () => {
    // Yeni bir tür eklenip örneksiz bırakılırsa bu test kırılır; aksi
    // halde tür sessizce test dışı kalırdı.
    expect(Object.keys(ornekler).sort()).toEqual([...TURLER].sort());
  });

  for (const tur of TURLER) {
    describe(tur, () => {
      for (const deger of ornekler[tur].gecerli) {
        it(`kabul: ${JSON.stringify(deger.slice(0, 40))}`, () => {
          const sunucu = alanDogrula(deger, tur, "Alan", { zorunlu: false });
          expect(sunucu.ok, `sunucu reddetti: ${sunucu.ok ? "" : sunucu.hata}`).toBe(true);
          expect(tarayiciKabulEderMi(tur, deger), "tarayıcı reddetti").toBe(true);
        });
      }

      for (const deger of ornekler[tur].gecersiz) {
        it(`ret: ${JSON.stringify(deger.slice(0, 40))}`, () => {
          expect(alanDogrula(deger, tur, "Alan", { zorunlu: true }).ok).toBe(false);

          // `type="color"` bu iddianın dışında ve olması gerektiği için
          // dışında: tarayıcı orada `pattern`/`maxLength` niteliklerini YOK
          // SAYIYOR ve geçersiz bir değer atandığında sessizce "#000000"a
          // düşürüyor — yani renk seçici geçersiz değer ÜRETEMİYOR, ama
          // "reddetmiyor" da. İkisini aynı iddiaya sokmak, testi gerçeğe
          // uymayan bir şeyi doğrulamaya zorlardı. (Ayrı testi aşağıda.)
          if (alanKurali(tur).girdiTuru === "color") return;

          expect(tarayiciKabulEderMi(tur, deger)).toBe(false);
        });
      }
    });
  }
});

describe("alanDogrula", () => {
  it("boşlukları kırpar", () => {
    expect(alanDogrula("  ada.kahvesi  ", "kullaniciAdi", "Kullanıcı adı")).toEqual({
      ok: true,
      deger: "ada.kahvesi",
    });
  });

  it("isteğe bağlı alan boş geçilebilir", () => {
    expect(alanDogrula("", "telefon", "Telefon", { zorunlu: false })).toEqual({
      ok: true,
      deger: "",
    });
  });

  it("isteğe bağlı alan DOLUYSA biçimi denetleniyor", () => {
    // Asıl tuzak burada: "zorunlu değil" ile "serbest" aynı şey değil.
    expect(alanDogrula("abc", "telefon", "Telefon", { zorunlu: false }).ok).toBe(false);
  });

  it("string olmayan girdi boş sayılıyor", () => {
    // Server Action'a `formData.get()` bir File de döndürebilir.
    for (const ham of [null, undefined, 42, {}, [], new Date()]) {
      expect(alanDogrula(ham, "eposta", "E-posta").ok).toBe(false);
    }
  });

  it("uzunluk sınırı desenden ÖNCE bakılıyor", () => {
    // 2 MB'lık girdi düzenli ifadeye hiç girmemeli; girse geri izleme
    // maliyeti tek istekle işlemciyi meşgul edebilirdi. Ölçülebilir tek
    // iddia: bu çağrı anında dönüyor.
    const devasa = "a".repeat(2_000_000);
    const basla = performance.now();
    expect(alanDogrula(devasa, "eposta", "E-posta").ok).toBe(false);
    expect(performance.now() - basla).toBeLessThan(100);
  });

  it("hata mesajı alan adını içeriyor", () => {
    const sonuc = alanDogrula("", "eposta", "Sorumlu e-postası");
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("Sorumlu e-postası");
  });
});

describe("alanOzellikleri", () => {
  it("zorunlu alana minLength ve required koyuyor", () => {
    const o = alanOzellikleri("kullaniciAdi");
    expect(o).toMatchObject({ required: true, minLength: 3, maxLength: 32 });
  });

  it("isteğe bağlı alana minLength KOYMUYOR", () => {
    // minLength konsaydı tarayıcı boş değeri "çok kısa" sayar ve isteğe
    // bağlı alan zorunluya dönüşürdü — kullanıcı sebebini göremez.
    const o = alanOzellikleri("telefon", { zorunlu: false });
    expect(o.minLength).toBeUndefined();
    expect(o.required).toBeUndefined();
    expect(o.maxLength).toBe(20);
  });

  it("her tür bir title veriyor", () => {
    for (const tur of TURLER) {
      expect(alanOzellikleri(tur).title.length, tur).toBeGreaterThan(0);
    }
  });

  it("metin alanlarının hepsinde maxLength var", () => {
    for (const tur of TURLER) {
      if (alanKurali(tur).girdiTuru === "color") continue;
      expect(alanOzellikleri(tur).maxLength, tur).toBeGreaterThan(0);
    }
  });

  it("renk alanına pattern/maxLength KONMUYOR", () => {
    /**
     * Tarayıcıda doğrulandı: `type="color"` alana "kirmizi" atandığında
     * değer sessizce "#000000" oluyor ve `checkValidity()` true dönüyor —
     * yani `pattern` niteliği orada hiçbir şey yapmıyor.
     *
     * İşlevsiz bir doğrulama niteliği bırakmak, olmamasından KÖTÜ: onu
     * gören sonraki okuyucu alanın korunduğuna inanır. Renk alanının
     * gerçek koruması sunucu tarafında.
     */
    const o = alanOzellikleri("renk", { zorunlu: false });
    expect(o.type).toBe("color");
    expect(o.pattern).toBeUndefined();
    expect(o.maxLength).toBeUndefined();

    // Sunucu tarafı ise deneti YAPIYOR — elle kurulmuş istek buradan geçer.
    expect(alanDogrula("kirmizi", "renk", "Renk", { zorunlu: false }).ok).toBe(false);
    expect(alanDogrula("#a1b2c3", "renk", "Renk", { zorunlu: false }).ok).toBe(true);
  });

  it("şifre alanına pattern KOYMUYOR", () => {
    // Karakter kısıtı parolayı zayıflatır; sınır yalnızca uzunluk.
    expect(alanOzellikleri("sifre").pattern).toBeUndefined();
    expect(alanOzellikleri("sifre").maxLength).toBe(128);
  });
});

describe("desenler tek kaynakta kalıyor", () => {
  /**
   * Danışmanın maddelerinden biri "kod tekrarı yaptırma"ydı ve bu proje
   * için somut bir örneği vardı: aynı e-posta deseni DÖRT ayrı dosyada
   * elle yazılmıştı (deneme, kullanicilar, isletmeler, hesaplar) ve
   * hiçbirinde uzunluk sınırı yoktu. Aynı şekilde `/^https?:\/\//i` tek
   * bir dosyada üç kez tekrarlanıyordu.
   *
   * Kopyaların asıl zararı sayı değil AYRIŞMA: biri sıkılaşıyor, diğeri
   * olduğu yerde kalıyor ve hangisinin geçerli olduğu çağrı yoluna
   * bakmadan bilinemiyor.
   *
   * Bu test kopyanın geri gelmesini engelliyor: uygulama katmanında
   * (`src/app`) bu biçimlere ait elle yazılmış desen kalmamalı.
   */
  const KOKLER = [join(process.cwd(), "src/app")];

  /** Uygulama katmanında görülmemesi gereken desen imzaları. */
  const YASAKLI: { imza: RegExp; ad: string; yerine: string }[] = [
    { imza: /@\\S\+\\\./, ad: "e-posta deseni", yerine: 'alanDogrula(..., "eposta", ...)' },
    { imza: /\^https\?:\\\/\\\//, ad: "http(s) ön eki denetimi", yerine: 'alanDogrula(..., "webAdresi", ...)' },
  ];

  function tsDosyalari(kok: string): string[] {
    const sonuc: string[] = [];
    for (const ad of readdirSync(kok)) {
      const tam = join(kok, ad);
      if (statSync(tam).isDirectory()) sonuc.push(...tsDosyalari(tam));
      else if (/\.tsx?$/.test(ad) && !ad.includes(".test.")) sonuc.push(tam);
    }
    return sonuc;
  }

  const dosyalar = KOKLER.flatMap(tsDosyalari);

  it("taranacak dosya bulundu", () => {
    // Tarama boşa düşerse test hiçbir şey sınamadan yeşil kalırdı.
    expect(dosyalar.length).toBeGreaterThan(50);
  });

  /**
   * Yorumlar çıkarılıyor: bu dosyaların bir kısmı "eskiden şu desen
   * vardı" diye ANLATIYOR ve anlatının kendisi bulguya dönüşürse test,
   * kendi gerekçesini yazmayı cezalandırır hâle gelirdi.
   */
  function yorumsuz(kaynak: string): string {
    return kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }

  for (const { imza, ad, yerine } of YASAKLI) {
    it(`${ad} uygulama katmanında elle yazılmıyor`, () => {
      const bulunanlar = dosyalar.filter((d) => imza.test(yorumsuz(readFileSync(d, "utf8"))));
      expect(
        bulunanlar.map((d) => d.slice(process.cwd().length + 1)),
        `Bu dosyalarda elle yazılmış ${ad} var. Yerine ${yerine} kullanın — ` +
          `kopya desenler kaçınılmaz olarak ayrışıyor.`,
      ).toEqual([]);
    });
  }
});
