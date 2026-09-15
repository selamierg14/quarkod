import type { Dogrulama } from "./girdi";

/**
 * Alan biçimlerinin TEK KAYNAĞI — hem tarayıcı hem sunucu buradan okur.
 *
 * Sorun neydi: aynı kural iki yerde, iki dille yazılıyordu. Sunucuda
 * `/^\S+@\S+\.\S+$/`, arayüzde `type="email"`; sunucuda "en fazla 80
 * karakter", arayüzde hiçbir şey. İki kopya kaçınılmaz olarak ayrışıyor ve
 * ayrıştığı yön hep aynı: ARAYÜZ GEVŞEK KALIYOR. Sonuç, kullanıcının
 * ancak sunucudan dönen hatayla öğrendiği bir kural — ve daha kötüsü,
 * doğrulanmadan veritabanına kadar giden bir istek.
 *
 * Buradaki kayıt bunu tersine çeviriyor:
 *
 *   - `alanOzellikleri("eposta")` → `<input>` üzerine serpilen
 *     `maxLength`/`pattern`/`inputMode` nitelikleri. Tarayıcı formu
 *     GÖNDERMEDEN reddediyor; istek ağa hiç çıkmıyor.
 *   - `alanDogrula(ham, "eposta", "E-posta")` → sunucu tarafında AYNI
 *     desenle doğrulama. Tarayıcı doğrulaması bir kolaylık, güvenlik
 *     sınırı değil: `curl` ile doğrudan Server Action'a POST edilebilir.
 *
 * İkisi de `DESENLER` kaydından beslendiği için ayrışamıyorlar. Bir alanın
 * sınırı değişince iki taraf birlikte değişiyor.
 *
 * ---
 *
 * DESEN KAYNAĞI NEDEN DÜZ METİN (RegExp değil)?
 *
 * HTML `pattern` niteliği bir dize alıyor ve tarayıcı onu ÖRTÜK OLARAK
 * baştan sona sabitleyip (`^...$`) `v` bayrağıyla derliyor. Kaynağı metin
 * tutup iki tarafın da aynı metinden derlemesi, "aynı desen" iddiasını
 * gerçekten aynı kılıyor.
 *
 * `v` bayrağının bir tuzağı var: karakter sınıfı içinde `( ) [ ] { } / - |`
 * karakterleri KAÇIŞSIZ yazılamıyor (eski `u` bayrağında yazılabiliyordu).
 * Bu yüzden aşağıdaki sınıflarda `\(`, `\)`, `\-` görülüyor. Testi bu
 * kuralı iki bayrakla birden doğruluyor — desenler.test.ts.
 */

/** Bir alanın biçim kuralı. */
export type AlanKurali = {
  /** HTML `pattern` kaynağı. Yoksa yalnızca uzunluk sınırı geçerli. */
  readonly desen?: string;
  readonly enAz: number;
  readonly enCok: number;
  /** Hem `title` niteliği hem sunucu hata mesajı. Tek cümle, Türkçe. */
  readonly ipucu: string;
  /** `<input type=...>` — varsayılan "text". */
  readonly girdiTuru?: "text" | "email" | "tel" | "url" | "password" | "color";
  /** Mobilde açılacak klavye. */
  readonly klavye?: "numeric" | "tel" | "email" | "url";
  /** Tarayıcının otomatik doldurma ipucu. */
  readonly otomatik?: string;
};

/**
 * Tanınan alan türleri.
 *
 * Türler alan ADINA değil BİÇİMİNE göre: "misafir adı", "sorumlu adı" ve
 * "hesap sahibi adı" aynı `kisiAdi` kuralını paylaşıyor. Böylece yeni bir
 * form açan kişi sınır uydurmak yerine var olan bir türü seçiyor.
 */
export const DESENLER = {
  // --- Kimlik --------------------------------------------------------------

  /**
   * E-posta.
   *
   * Kasıtlı olarak RFC 5322'nin tamamı değil: tam desen okunamaz uzunlukta
   * ve pratikte yanlış pozitif üretiyor. Buradaki iş "@ ve bir nokta var
   * mı" değil, "veritabanına saçma bir şey girmesin" — gerçek doğrulama
   * zaten adrese posta ulaşıp ulaşmadığı.
   *
   * 254 sınırı RFC 5321'in adres uzunluğu üst sınırı.
   */
  eposta: {
    desen: "[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}",
    enAz: 5,
    enCok: 254,
    ipucu: "Geçerli bir e-posta adresi girin (ör. ad@ornek.com).",
    girdiTuru: "email",
    klavye: "email",
    otomatik: "email",
  },

  /**
   * Panel giriş adı — YENİ kullanıcı açarken uygulanan kural.
   * lib/kimlik/username.ts ile aynı küme; o dosya türetme (toUsername)
   * yapıyor, buradaki kayıt biçimi ilan ediyor.
   *
   * Tire de kabul ediliyor: veritabanındaki 74 panel kullanıcısının 51'i
   * `kusdili-kahvecisi.demo` gibi tireli adlarla açılmıştı (tohumlama
   * betikleri adı slug'dan türetiyor ve slug tire üretiyor). Tireyi dışarıda
   * bırakan kural, bu hesapların kendi adlarını KAYDEDEMEMESİ demekti:
   * düzenleme formu açılıyor, kaydet deyince "geçersiz kullanıcı adı"
   * hatası veriyordu. Tirenin dışlanmasının hiçbir güvenlik karşılığı yok.
   */
  kullaniciAdi: {
    desen: "[a-z0-9._\\-]+",
    enAz: 3,
    enCok: 32,
    ipucu: "Yalnızca küçük harf, rakam, nokta, tire ve alt çizgi kullanın.",
    otomatik: "username",
  },

  /**
   * GİRİŞ ekranındaki kimlik alanı — bilerek `kullaniciAdi`'ndan GEVŞEK.
   *
   * Giriş formu, kaydedilmiş olabilecek her kullanıcı adını kabul etmek
   * zorunda. Bugünün açılış kuralını giriş ekranında dayatmak, dünün
   * kuralıyla açılmış hesapları kilitler — kural her sıkılaştığında bir
   * grup kullanıcı sessizce dışarıda kalır ve bunu ancak giremeyen kişi
   * fark eder.
   *
   * Buradaki tek iş uzunluğu sınırlamak, ve o sınır bir güvenlik gereği:
   * bu değer önce hız sınırı tablosuna anahtar olarak yazılıyor, sonra
   * `user.findUnique` ile veritabanına gidiyordu. Sınırsızken 5 MB'lık bir
   * "kullanıcı adı" tek istekte hem tabloyu şişiriyor hem sorguyu
   * pahalılaştırıyordu. Biçim denetimi ise gereksiz: eşleşmeyen ad zaten
   * "kullanıcı bulunamadı" ile dönüyor.
   */
  girisKimligi: {
    enAz: 1,
    enCok: 64,
    ipucu: "Kullanıcı adı en fazla 64 karakter olabilir.",
    otomatik: "username",
  },

  /**
   * Cep telefonu — arayüzde okunabilir biçimlere izin var (boşluk,
   * parantez, tire), sunucuda normalizePhone() +905XXXXXXXXX'e çeviriyor.
   * Desen burada "yazarken engelleme" işi görüyor; kanonik biçimi
   * dayatmak kullanıcıyı 0532... yazdığı için geri çevirmek olurdu.
   */
  telefon: {
    desen: "[0-9 \\(\\)+\\-]{10,20}",
    enAz: 10,
    enCok: 20,
    ipucu: "Cep telefonunu 5XX ile başlayacak şekilde girin (ör. 0532 123 45 67).",
    girdiTuru: "tel",
    klavye: "tel",
    otomatik: "tel",
  },

  /** SMS doğrulama kodu. */
  dogrulamaKodu: {
    desen: "[0-9]{6}",
    enAz: 6,
    enCok: 6,
    ipucu: "Kod 6 rakamdan oluşur.",
    klavye: "numeric",
    otomatik: "one-time-code",
  },

  /**
   * Şifre — DESEN YOK, yalnızca uzunluk.
   *
   * Karakter kısıtı koymak güvenliği DÜŞÜRÜR: kullanıcıyı "Sifre1!" gibi
   * tahmin edilebilir kalıplara iter ve parola yöneticisinin ürettiği
   * güçlü diziyi reddeder. İçerik kuralı tek yerde: lib/kimlik/sifre.ts.
   *
   * ÜST SINIR ise bir güvenlik gereği: bcrypt maliyeti girdiyle birlikte
   * artıyor ve 1 MB'lık bir "şifre" ile giriş formu tek istekte sunucuyu
   * meşgul edebiliyordu. bcrypt zaten 72 baytın ötesini yok sayıyor;
   * 128'lik sınır hiçbir gerçek parolayı kesmiyor.
   */
  sifre: {
    enAz: 8,
    enCok: 128,
    ipucu: "Şifre en az 8, en fazla 128 karakter olmalı.",
    girdiTuru: "password",
  },

  /**
   * GİRİŞ ekranındaki şifre alanı — `sifre`'den yalnızca ALT sınırı yok.
   *
   * Üst sınır aynı ve aynı sebeple duruyor (bcrypt maliyeti). Ama asgari
   * uzunluk bir AÇILIŞ politikası, giriş şartı değil: kural sıkılaştığında
   * daha gevşek bir kuralla açılmış hesaplar hâlâ var ve onları giriş
   * ekranında reddetmek, "şifrem doğru ama giremiyorum" demek olurdu.
   * Kullanıcı şifresini ancak GİREBİLİRSE güncelleyebilir; kapıyı kapatmak
   * onu düzeltme yolunu da kapatır.
   *
   * Aynı gerekçe `girisKimligi` için de geçerli — ikisi de "dünün verisini
   * bugünün kuralıyla yargılama" ilkesinin uygulaması.
   */
  girisSifresi: {
    enAz: 1,
    enCok: 128,
    ipucu: "Şifre en fazla 128 karakter olabilir.",
    girdiTuru: "password",
  },

  // --- Bağlantı ve renk ----------------------------------------------------

  /**
   * Marka rengi.
   *
   * Bu alan hiç doğrulanmıyordu ve değeri karekod üreticisine ham olarak
   * gidiyor — geçersiz bir renk QR sayfasını tamamen çökertiyordu. Altı
   * haneli HEX tek kabul edilen biçim, çünkü karekod kütüphanesi
   * `rgb()`/`hsl()` anlamıyor.
   */
  renk: {
    desen: "#[0-9a-fA-F]{6}",
    enAz: 7,
    enCok: 7,
    ipucu: "Renk # ile başlayan altı haneli HEX olmalı (ör. #111827).",
    girdiTuru: "color",
  },

  /**
   * Dış bağlantı.
   *
   * `https?` şartı yalnızca biçim değil güvenlik: şema serbest bırakılsa
   * `javascript:` ya da `data:` bir bağlantı olarak sayfaya basılabilirdi.
   */
  webAdresi: {
    desen: "https?://\\S+",
    enAz: 8,
    enCok: 500,
    ipucu: "Bağlantı http:// veya https:// ile başlamalı.",
    girdiTuru: "url",
    klavye: "url",
  },

  // --- Serbest metin -------------------------------------------------------

  /**
   * Kişi adı.
   *
   * Sınıf Türkçe harfleri kapsıyor (`\p{L}`) — "Şükrü Öztürk" reddedilmemeli.
   *
   * NOKTALAMA KÜMESİ GERÇEK VERİYE GÖRE GENİŞLETİLDİ. İlk hâli yalnızca
   * nokta, virgül, kesme ve tire kabul ediyordu; veritabanındaki kayıtlar
   * taranınca "Nefes Cafe & Bistro Sahibi" reddediliyordu. Ad alanı yanlış
   * pozitifin en pahalı olduğu yer: kullanıcı kendi adını yazamıyor ve
   * bunu bir destek talebi olarak öğreniyoruz.
   *
   * Dışarıda kalan asıl şey `<` ve `>`. Bunun sebebi XSS DEĞİL — React
   * çıktıyı zaten kaçırıyor, Prisma sorguyu parametreliyor. Sebep, bu adın
   * HTML kaçışı olmayan kanallara da gitmesi: PDF üretimi, SMS gövdesi,
   * e-posta konusu. Oralarda işaretleme benzeri bir dizinin hiç işi yok.
   */
  kisiAdi: {
    desen: "[\\p{L}\\p{M}0-9 .,'’&\\(\\)\\/\\-]+",
    enAz: 2,
    enCok: 80,
    ipucu: "Ad soyad 2-80 karakter olmalı; harf, rakam ve nokta içerebilir.",
    otomatik: "name",
  },

  /** İşletme / hesap / rota adı — kişi adından daha serbest, sembol geçebilir. */
  isletmeAdi: {
    enAz: 2,
    enCok: 80,
    ipucu: "Ad 2-80 karakter olmalı.",
  },

  /** Duyuru/kampanya başlığı, görev adı, kategori adı gibi tek satırlıklar. */
  kisaBaslik: {
    enAz: 1,
    enCok: 120,
    ipucu: "En fazla 120 karakter.",
  },

  /** Çok satırlı serbest açıklama. */
  aciklama: {
    enAz: 0,
    enCok: 500,
    ipucu: "En fazla 500 karakter.",
  },

  /** Uzun serbest not (iç not, geri bildirim yanıtı). */
  not: {
    enAz: 0,
    enCok: 1000,
    ipucu: "En fazla 1000 karakter.",
  },

  /** Açık adres. */
  adres: {
    enAz: 0,
    enCok: 300,
    ipucu: "Adres en fazla 300 karakter.",
    otomatik: "street-address",
  },

  /** Masa adı/numarası. */
  masaAdi: {
    desen: "[\\p{L}\\p{M}0-9 .\\-]+",
    enAz: 1,
    enCok: 40,
    ipucu: "Masa adı 1-40 karakter olmalı.",
  },

  /**
   * Wi-Fi ağ adı. 32 sınırı uydurma değil: SSID standardı (IEEE 802.11)
   * 32 bayt. Daha uzunu zaten hiçbir cihazda çalışmaz.
   */
  wifiAdi: {
    enAz: 1,
    enCok: 32,
    ipucu: "Wi-Fi ağ adı en fazla 32 karakter olabilir.",
  },

  /** WPA/WPA2 parolası — standart üst sınırı 63 karakter. */
  wifiSifresi: {
    enAz: 0,
    enCok: 63,
    ipucu: "Wi-Fi şifresi en fazla 63 karakter olabilir.",
  },

  /** İYS marka kodu — İleti Yönetim Sistemi'nden alınan sayısal kod. */
  iysKodu: {
    desen: "[0-9]{3,12}",
    enAz: 3,
    enCok: 12,
    ipucu: "İYS marka kodu yalnızca rakamlardan oluşur.",
    klavye: "numeric",
  },
} as const satisfies Record<string, AlanKurali>;

export type AlanTuru = keyof typeof DESENLER;

/**
 * Deseni derler.
 *
 * `^(?:...)$` sarmalaması tarayıcının örtük sabitlemesini birebir taklit
 * ediyor. Sarmalama olmasaydı `https?://\S+` deseni "zararsız metin
 * https://x zararsız metin" dizesini de kabul ederdi — tarayıcı ise
 * reddederdi. İki taraf ayrışmasın diye kural burada da aynı.
 *
 * Bayrak `u`: `v` daha yeni ve daha katı ama Node'un tüm sürümlerinde
 * yok. Testler her desenin İKİ bayrakla da derlendiğini doğruluyor, bu
 * yüzden pratikte fark üretmiyor.
 */
function derle(kaynak: string): RegExp {
  return new RegExp(`^(?:${kaynak})$`, "u");
}

// Desenler sabit; her çağrıda yeniden derlemek gereksiz.
const derlenmis = new Map<string, RegExp>();
function desenIcin(kaynak: string): RegExp {
  let hazir = derlenmis.get(kaynak);
  if (!hazir) {
    hazir = derle(kaynak);
    derlenmis.set(kaynak, hazir);
  }
  return hazir;
}

/** Bir alan türünün kuralını verir. */
export function alanKurali(tur: AlanTuru): AlanKurali {
  return DESENLER[tur];
}

/**
 * SUNUCU tarafı doğrulama.
 *
 * `zorunlu` varsayılan olarak `enAz > 0` demek: alt sınırı olan bir alanın
 * boş geçilebilmesi çelişki olurdu. İsteğe bağlı ama doluysa biçimi
 * denetlenen alanlar için (`telefon` gibi) açıkça `zorunlu: false` verilir.
 *
 * Metin KIRPILMIYOR, REDDEDİLİYOR: sessizce kesmek, kullanıcının yazdığı
 * ile kaydedilenin farklı olduğu bir sınıf hata üretiyor (yarım kalmış bir
 * telefon numarası, ortasından kesilmiş bir bağlantı). Kırpma isteniyorsa
 * girdi.ts'teki `metinAlani` kullanılmalı — o, serbest metin için.
 */
export function alanDogrula(
  ham: unknown,
  tur: AlanTuru,
  ad: string,
  { zorunlu }: { zorunlu?: boolean } = {},
): Dogrulama<string> {
  const kural = DESENLER[tur] as AlanKurali;
  const gerekli = zorunlu ?? kural.enAz > 0;
  const metin = typeof ham === "string" ? ham.trim() : "";

  if (!metin) {
    return gerekli ? { ok: false, hata: `${ad} gerekli.` } : { ok: true, deger: "" };
  }
  // Uzunluk DESENDEN ÖNCE: 5 MB'lık bir girdiyi düzenli ifadeye sokmak,
  // desen geri izleme yapıyorsa tek istekle işlemciyi meşgul edebilir.
  // Önce ucuz kontrol.
  if (metin.length > kural.enCok) {
    return { ok: false, hata: `${ad} en fazla ${kural.enCok} karakter olabilir.` };
  }
  if (metin.length < kural.enAz) {
    return { ok: false, hata: `${ad} en az ${kural.enAz} karakter olmalı.` };
  }
  if (kural.desen && !desenIcin(kural.desen).test(metin)) {
    return { ok: false, hata: `${ad}: ${kural.ipucu}` };
  }
  return { ok: true, deger: metin };
}

/** `<input>` / `<textarea>` üzerine serpilecek nitelikler. */
export type AlanOzellikleri = {
  /** `type="color"` alanlarda verilmiyor — tarayıcı yok sayıyor. */
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  title: string;
  required?: boolean;
  type?: string;
  inputMode?: "numeric" | "tel" | "email" | "url";
  autoComplete?: string;
};

/**
 * ARAYÜZ tarafı nitelikleri.
 *
 *     <input name="email" {...alanOzellikleri("eposta", { zorunlu: true })} />
 *
 * Tarayıcı bu niteliklerle formu göndermeden reddediyor: geçersiz istek ağa
 * çıkmıyor, sunucuya ulaşmıyor, veritabanına hiç dokunmuyor. Kullanıcı da
 * sayfa gidip gelmeden, alanın yanında anında geri bildirim alıyor.
 *
 * Bu bir GÜVENLİK KATMANI DEĞİL — niteliklerin hepsi geliştirici araçlarından
 * silinebilir, istek doğrudan da atılabilir. Güvenlik `alanDogrula` ile
 * sunucuda; buradaki kazanç deneyim ve gereksiz sunucu yükünün önlenmesi.
 *
 * Bunun somut bir örneği var ve tarayıcıda doğrulandı: `minLength` ve
 * `maxLength` yalnızca DEĞER KULLANICI TARAFINDAN DÜZENLENDİYSE hata
 * üretiyor (HTML belirtimindeki "dirty value" kuralı). Betikle atanan bir
 * değerde `validity.tooShort` false kalıyor. Yani elle kurulmuş bir istek
 * bir yana, sayfaya enjekte edilen bir betik bile bu sınırları aşabiliyor.
 * Gerçek kullanıcı için çalışıyor (86 karakter yazıldığında alan 64'te
 * kesiyor), sınır olarak güvenilecek yer ise yalnızca sunucu.
 *
 * `minLength` yalnızca zorunlu alanlarda veriliyor: isteğe bağlı bir alana
 * `minLength` koymak, alanı boş bırakmayı da engeller (tarayıcı boş değeri
 * kısa sayar) ve kullanıcı neden gönderemediğini anlamaz.
 */
export function alanOzellikleri(
  tur: AlanTuru,
  { zorunlu }: { zorunlu?: boolean } = {},
): AlanOzellikleri {
  const kural = DESENLER[tur] as AlanKurali;
  const gerekli = zorunlu ?? kural.enAz > 0;

  // `type="color"` için `pattern` ve uzunluk nitelikleri TARAYICI
  // TARAFINDAN YOK SAYILIYOR — HTML belirtiminde bu nitelikler yalnızca
  // metin türü alanlara uygulanıyor. Renk seçici zaten geçersiz bir değer
  // üretemiyor: atanan tanınmayan değer sessizce "#000000" oluyor.
  //
  // O yüzden bu nitelikler oraya konmuyor. Konsaydı zararsız değil
  // YANILTICI olurdu: `pattern` niteliğini gören sonraki okuyucu alanın
  // desenle korunduğuna inanır, oysa hiçbir şey yapmıyor. Renk alanının
  // gerçek koruması sunucudaki `alanDogrula(..., "renk")` — ve asıl
  // tehdit de zaten tarayıcı değil, elle kurulmuş istek.
  const metinAlaniMi = kural.girdiTuru !== "color";

  return {
    ...(metinAlaniMi ? { maxLength: kural.enCok } : {}),
    ...(metinAlaniMi && gerekli && kural.enAz > 0 ? { minLength: kural.enAz } : {}),
    ...(metinAlaniMi && kural.desen ? { pattern: kural.desen } : {}),
    title: kural.ipucu,
    ...(gerekli ? { required: true } : {}),
    ...(kural.girdiTuru ? { type: kural.girdiTuru } : {}),
    ...(kural.klavye ? { inputMode: kural.klavye } : {}),
    ...(kural.otomatik ? { autoComplete: kural.otomatik } : {}),
  };
}
