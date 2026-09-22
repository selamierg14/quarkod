import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * PANEL YÜZEYİNİN KAPI ÖRTÜSÜ — yapısal gerileme testi.
 *
 * Danışmanın sorusu şuydu: "hiçbir route'uma kontrolsüz erişilemiyor
 * olması lazım." Tüketici API'si için bunun cevabı api-politika.ts'teki
 * tablo ve onun disk karşılaştırması. Panelin (`/admin/*`) böyle bir
 * tablosu yok ve olamaz da: burada onlarca Server Action ve RSC sayfası
 * var, her biri kendi kapısını kendi çağırıyor.
 *
 * O yüzden iddia tersten kuruluyor: DİSKTEKİ HER eylem ve HER sayfa, bir
 * kapıya ULAŞMAK ZORUNDA. Ulaşmayan tek bir tane çıkarsa test kırılıyor.
 *
 * Neden gerekli: middleware `/admin/*` için yalnızca "imzalı çerez var mı"
 * diye bakıyor — Edge'de koştuğu için veritabanına erişemiyor. Yani
 * "giriş yapmış HERHANGİ bir kullanıcı" middleware'den geçiyor; garson mu
 * patron mu, hangi kiracıdan, aboneliği sürüyor mu — bunların hepsi
 * route'un KENDİ kapısında karara bağlanıyor. Kapısı unutulmuş tek bir
 * eylem, panele girebilen herkese açık demek.
 *
 * Testin yaptığı statik bir okuma, çalışma zamanı kanıtı değil: bir
 * fonksiyonun kapıyı çağırdığını görüyor, kapının doğru olduğunu değil.
 * "Hangi kapı doğru" sorusunun cevabı tenancy.test.ts ve
 * yetki-yukseltme.test.ts'te; buradaki soru daha temel — kapı VAR MI.
 */

const ADMIN = join(process.cwd(), "src/app/admin");

/**
 * Kapı sayılan çağrılar.
 *
 * `getSession` de listede: doğrudan oturumu okuyup kendi kararını veren
 * route'lar (ör. kupon yakma ucu) redirect atamıyor, o yüzden require*
 * sarmalayıcılarını kullanamıyor.
 */
const KAPILAR = [
  "requireUser",
  "requireOwner",
  "requireYazma",
  "requireSuperadmin",
  "requireTenant",
  "requireTenantOwner",
  "requireModul",
  "requireMenuErisim",
  "requireAnketErisim",
  "requirePersonelYonetimi",
  "requireKesfetErisim",
  "requireRezervasyonErisim",
  "requireKullaniciYonetimi",
  // İşletme ayarları: garsonu dışarıda bırakan rol kapısı. `requireYazma`
  // bu soruyu cevaplamıyordu (salt okunur listesi boş) ve garson menüde
  // gizli olan ayar sayfasını adresten açıp kaydedebiliyordu.
  "requireIsletmeYonetimi",
  "requireIsletmeSayfasi",
  "getSession",
];

/**
 * Kapısız olmasına İZİN VERİLEN yerler — her biri gerekçesiyle.
 *
 * Liste bilerek kısa ve bilerek elle yazılmış: buraya bir satır eklemek,
 * "bu uç kimlik istemiyor" demenin yazılı hâli olsun ve inceleme sırasında
 * gözden kaçmasın.
 */
const KAPISIZ_OLABILIR: Record<string, string> = {
  "giris/actions.ts::loginAction":
    "Giriş eyleminin kendisi; kapısı olsaydı kimse giremezdi. Kötüye " +
    "kullanıma karşı korunması hız sınırı (login-guard) ve kısa ömürlü " +
    "imzalı challenge çerezi.",
  "giris/actions.ts::logout":
    "Çıkış. Oturumu olmayan birinin çerezi silmesi zararsız; kapı koymak " +
    "süresi dolmuş oturumu temizlemeyi imkânsız kılardı.",
};

/** Bir klasör ağacındaki dosyaları toplar. */
function dosyalar(kok: string, filtre: (ad: string) => boolean): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(kok)) {
    const tam = join(kok, ad);
    if (statSync(tam).isDirectory()) sonuc.push(...dosyalar(tam, filtre));
    else if (filtre(ad)) sonuc.push(tam);
  }
  return sonuc;
}

const goreli = (tam: string) => tam.slice(ADMIN.length + 1);

/**
 * Kapıya ULAŞAN isimlerin kümesi — sabit nokta.
 *
 * Eylemlerin çoğu kapıyı doğrudan çağırmıyor, dosyaya özel bir yardımcıya
 * devrediyor (`menuIzni`, `yetkiliMi`, `isletmeyiYukle`). Yalnızca doğrudan
 * çağrıya baksaydık bu dosyaların tamamı yanlışlıkla "kapısız" görünürdü —
 * ve o gürültü, testi işe yaramaz kılardı.
 *
 * Bu yüzden küme genişletiliyor: kapı çağıran bir fonksiyonun ADI da kapı
 * sayılıyor, sonra onu çağıranlar, ta ki küme büyümeyi bırakana kadar.
 */
function kapiyaUlasanlar(kaynaklar: string[]): Set<string> {
  const ulasan = new Set(KAPILAR);

  // Ad → gövde. Aynı ad farklı dosyalarda tekrarlanabiliyor; hepsi
  // toplanıyor.
  const govdeler = new Map<string, string[]>();
  for (const src of kaynaklar) {
    for (const parca of src.split(/\n(?:export )?(?:async )?function /).slice(1)) {
      const ad = parca.match(/^(\w+)/)?.[1];
      if (!ad) continue;
      const liste = govdeler.get(ad) ?? [];
      liste.push(parca);
      govdeler.set(ad, liste);
    }
    // `const yardimci = async (...) => {...}` biçimi de kullanılıyor.
    for (const eslesme of src.matchAll(/\n(?:export )?const (\w+)\s*=\s*(?:async\s*)?\(/g)) {
      const ad = eslesme[1];
      const liste = govdeler.get(ad) ?? [];
      liste.push(src.slice(eslesme.index));
      govdeler.set(ad, liste);
    }
  }

  let buyudu = true;
  while (buyudu) {
    buyudu = false;
    for (const [ad, liste] of govdeler) {
      if (ulasan.has(ad)) continue;
      if (liste.some((govde) => cagiriyorMu(govde, ulasan))) {
        ulasan.add(ad);
        buyudu = true;
      }
    }
  }
  return ulasan;
}

/** Gövde, kümedeki adlardan birini çağırıyor mu? */
function cagiriyorMu(govde: string, adlar: Set<string>): boolean {
  for (const ad of adlar) {
    if (new RegExp(`\\b${ad}\\s*\\(`).test(govde)) return true;
  }
  return false;
}

const eylemDosyalari = dosyalar(ADMIN, (ad) => ad === "actions.ts");
const sayfaDosyalari = dosyalar(ADMIN, (ad) => ad === "page.tsx" || ad === "layout.tsx");
const tumKaynaklar = dosyalar(ADMIN, (ad) => ad.endsWith(".ts") || ad.endsWith(".tsx")).map(
  (d) => readFileSync(d, "utf8"),
);
const ULASAN = kapiyaUlasanlar(tumKaynaklar);

describe("her Server Action bir kapıdan geçiyor", () => {
  const eylemler: { yer: string; govde: string }[] = [];
  for (const dosya of eylemDosyalari) {
    const src = readFileSync(dosya, "utf8");
    for (const parca of src.split(/\nexport (?:async )?function /).slice(1)) {
      const ad = parca.match(/^(\w+)/)?.[1];
      if (ad) eylemler.push({ yer: `${goreli(dosya)}::${ad}`, govde: parca });
    }
  }

  it("panelde gerçekten Server Action var (tarama boşa düşmüyor)", () => {
    // Bölme deseni bozulursa liste sessizce boşalır ve test hiçbir şey
    // sınamadan yeşil kalırdı — testin en tehlikeli hâli.
    expect(eylemler.length).toBeGreaterThan(50);
  });

  for (const { yer, govde } of eylemler) {
    it(yer, () => {
      if (yer in KAPISIZ_OLABILIR) {
        // Muafiyet listesindekiler bilinçli; gerekçe sabitte yazılı.
        expect(KAPISIZ_OLABILIR[yer].length).toBeGreaterThan(20);
        return;
      }
      expect(
        cagiriyorMu(govde, ULASAN),
        `${yer} hiçbir yetki kapısına ulaşmıyor. Bir require* çağırın ` +
          `ya da gerekçesiyle KAPISIZ_OLABILIR listesine ekleyin.`,
      ).toBe(true);
    });
  }
});

describe("her panel sayfası bir kapıdan geçiyor", () => {
  for (const dosya of sayfaDosyalari) {
    const src = readFileSync(dosya, "utf8");
    const yer = goreli(dosya);

    it(yer, () => {
      // Yalnızca yönlendiren sayfalar veri okumuyor; kapıyı gidilen yer
      // uyguluyor.
      const sadeceYonlendirme =
        /\bredirect\s*\(/.test(src) && !/\bprisma\b/.test(src) && src.length < 1500;
      if (sadeceYonlendirme) return;

      expect(
        cagiriyorMu(src, ULASAN),
        `${yer} yetki kapısına ulaşmıyor — middleware yalnızca "çerez var mı" ` +
          `diye bakıyor, rol ve kiracı kontrolü burada yapılmalı.`,
      ).toBe(true);
    });
  }
});

describe("/api altındaki panel dışı uçlar korumalı", () => {
  const API = join(process.cwd(), "src/app/api");
  const rotalar = dosyalar(API, (ad) => ad === "route.ts").filter(
    (d) => !d.includes(join("api", "app")),
  );

  /** Kimlik istemeyen uçlar — her biri gerekçesiyle. */
  const ACIK: Record<string, string> = {
    "health/route.ts":
      "İzleme servisleri için; kimlik isteseydi işe yaramazdı. Gövdesi " +
      "bilgi sızdırmıyor: sürüm, bağlantı dizesi, tablo adı yok; eksik " +
      "ortam değişkenlerinin ADI değil yalnızca SAYISI dönüyor.",
  };

  it("panel dışı uç bulundu (tarama boşa düşmüyor)", () => {
    expect(rotalar.length).toBeGreaterThan(0);
  });

  for (const dosya of rotalar) {
    const yer = dosya.slice(API.length + 1);
    it(yer, () => {
      if (yer in ACIK) {
        expect(ACIK[yer].length).toBeGreaterThan(20);
        return;
      }
      const src = readFileSync(dosya, "utf8");
      // Zamanlanmış işler paylaşılan sırla, panel uçları oturumla korunuyor.
      const korumali = cagiriyorMu(src, ULASAN) || /\bcronYetkiliMi\s*\(/.test(src);
      expect(
        korumali,
        `${yer} korumasız görünüyor — oturum kapısı ya da cronYetkiliMi ` +
          `çağırın, ya da gerekçesiyle ACIK listesine ekleyin.`,
      ).toBe(true);
    });
  }
});
