import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GİRİŞ VE OTURUM AKIŞI.
 *
 * Bu store uygulamanın kapısı: yanlış davranınca kullanıcı ya içeri
 * giremiyor ya da girdiğini sanıp her istekte 401 alıyor. En sinsi hata
 * türü de burada — "çevrimdışıyken oturumu silmek" gibi, ancak metroda
 * uygulamayı açan birinin fark edebileceği şeyler.
 *
 * `istemci` modülü tamamen taklit ediliyor: gerçek `fetch` ve
 * SecureStore burada ne gerekli ne de mümkün (node ortamı).
 */

const depo = { deger: null as string | null };

const apiTaklidi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  acikGet: vi.fn(),
  acikPost: vi.fn(),
};

vi.mock("../api/istemci", () => ({
  api: apiTaklidi,
  jetonDeposu: {
    oku: async () => depo.deger,
    yaz: async (j: string) => {
      depo.deger = j;
    },
    sil: async () => {
      depo.deger = null;
    },
  },
  yerelTercih: { oku: async () => null, yaz: async () => {} },
}));

vi.mock("../api/onbellek", () => ({
  onbellekOku: async () => null,
  onbellekYaz: async () => {},
  onbellegiTemizle: async () => {},
}));

const { useOturum } = await import("./oturum");
const { useFavoriler } = await import("./favoriler");

const KULLANICI = {
  id: "k1",
  username: "deneme",
  name: "Deneme Kullanıcı",
  puan: 120,
  referralCode: "ABC123",
  plusUyeMi: false,
};

beforeEach(() => {
  depo.deger = null;
  vi.clearAllMocks();
  useOturum.setState({ durum: "yukleniyor", kullanici: null });
  useFavoriler.getState().temizle();
});

describe("giriş", () => {
  it("başarılı girişte jeton saklanıyor ve durum girişliye dönüyor", async () => {
    apiTaklidi.acikPost.mockResolvedValue({
      ok: true,
      veri: { jeton: "jeton-1", kullanici: KULLANICI },
    });

    const sonuc = await useOturum.getState().girisYap("deneme", "sifre123");

    expect(sonuc.ok).toBe(true);
    expect(depo.deger).toBe("jeton-1");
    expect(useOturum.getState().durum).toBe("girisli");
    expect(useOturum.getState().kullanici?.username).toBe("deneme");
  });

  it("hatalı girişte jeton YAZILMIYOR ve mesaj geri dönüyor", async () => {
    // Jeton yazılsaydı uygulama "girişli" sanıp her istekte 401 alırdı.
    apiTaklidi.acikPost.mockResolvedValue({
      ok: false,
      hata: "Kullanıcı adı ya da şifre hatalı.",
      durum: 401,
    });

    const sonuc = await useOturum.getState().girisYap("deneme", "yanlis");

    expect(sonuc).toEqual({ ok: false, hata: "Kullanıcı adı ya da şifre hatalı." });
    expect(depo.deger).toBeNull();
    expect(useOturum.getState().durum).not.toBe("girisli");
  });
});

describe("açılışta oturum tazeleme", () => {
  it("jeton yoksa doğrudan çıkışlı", async () => {
    await useOturum.getState().hazirla();
    expect(useOturum.getState().durum).toBe("cikisli");
    expect(apiTaklidi.get).not.toHaveBeenCalled();
  });

  it("jeton GEÇERSİZSE siliniyor", async () => {
    // Hesap askıya alınmış ya da şifre değişmiş olabilir; sunucu 401
    // dediğinde jetonu tutmanın bir anlamı yok.
    depo.deger = "eski-jeton";
    apiTaklidi.get.mockResolvedValue({ ok: false, hata: "Oturum geçersiz.", durum: 401 });

    await useOturum.getState().hazirla();

    expect(depo.deger).toBeNull();
    expect(useOturum.getState().durum).toBe("cikisli");
  });

  it("İNTERNET YOKKEN oturum KORUNUYOR", async () => {
    /**
     * TESTİN EN ÖNEMLİ MADDESİ ve gerçek bir hatanın kaydı.
     *
     * Önceden her başarısız yanıtta jeton siliniyordu — ağ hatası da
     * dahil. Sonuç: metroda ya da çekmeyen bir yerde uygulamayı açan
     * kullanıcı çıkış yapmış oluyor ve geri girmek için şifresini
     * yeniden yazmak zorunda kalıyordu. Tarayıcıda sunucu durdurularak
     * doğrulandı.
     *
     * `durum: 0` "istek hiç ulaşmadı" demek; 401 ile karıştırılmamalı.
     */
    depo.deger = "gecerli-jeton";
    apiTaklidi.get.mockResolvedValue({
      ok: false,
      hata: "Bağlantı kurulamadı. İnternetini kontrol et.",
      durum: 0,
    });

    await useOturum.getState().hazirla();

    expect(depo.deger).toBe("gecerli-jeton");
    expect(useOturum.getState().durum).toBe("girisli");
  });

  it("sunucu 5xx verdiğinde de oturum korunuyor", async () => {
    // Sunucu hatası kullanıcının kimliğiyle ilgili bir şey söylemiyor;
    // onu dışarı atmak bakım anını kitlenmeye çeviriyordu.
    depo.deger = "gecerli-jeton";
    apiTaklidi.get.mockResolvedValue({ ok: false, hata: "Sunucu hatası.", durum: 500 });

    await useOturum.getState().hazirla();

    expect(depo.deger).toBe("gecerli-jeton");
  });
});

describe("çıkış", () => {
  it("jeton ve kişiye bağlı veriler birlikte düşüyor", async () => {
    /**
     * Aynı telefonda ikinci bir kullanıcı giriş yaptığında bir
     * öncekinin favorileri ekranda kalmamalı.
     */
    depo.deger = "jeton-1";
    useOturum.setState({ durum: "girisli", kullanici: KULLANICI });
    useFavoriler.setState({
      mekanlar: [{ id: "m1", slug: "ada", ad: "Ada Kahvesi", logoUrl: null, markaRengi: null }],
      idler: new Set(["m1"]),
    });

    await useOturum.getState().cikisYap();

    expect(depo.deger).toBeNull();
    expect(useOturum.getState().durum).toBe("cikisli");
    expect(useFavoriler.getState().mekanlar).toBeNull();
    expect(useFavoriler.getState().idler.size).toBe(0);
  });
});

describe("favori aç/kapa", () => {
  const MEKAN = {
    id: "m1",
    slug: "ada",
    ad: "Ada Kahvesi",
    logoUrl: null,
    markaRengi: null,
  };

  it("istek DÜŞERSE değişiklik geri alınıyor", async () => {
    // İyimser güncelleme yalanla bitmemeli: kalp dolu kalıp sunucuda
    // kayıt olmasaydı kullanıcı favorilediğini sanırdı.
    apiTaklidi.post.mockResolvedValue({ ok: false, hata: "Bağlantı yok.", durum: 0 });

    const sonuc = await useFavoriler.getState().degistir(MEKAN);

    expect(sonuc).toBe(false);
    expect(useFavoriler.getState().idler.has("m1")).toBe(false);
    expect(useFavoriler.getState().mekanlar).toBeNull();
  });

  it("SUNUCUNUN sonucu istemcinin tahminini eziyor", async () => {
    /**
     * Uç bir AÇ/KAPA anahtarı. İki cihazdan aynı anda basıldığında
     * istemcinin tahmini ile sunucunun sonucu ayrışabiliyor; doğru olan
     * sunucununki.
     */
    apiTaklidi.post.mockResolvedValue({ ok: true, veri: { favoriMi: false } });

    const sonuc = await useFavoriler.getState().degistir(MEKAN);

    expect(sonuc).toBe(false);
    expect(useFavoriler.getState().idler.has("m1")).toBe(false);
  });

  it("başarılı eklemede liste başına giriyor", async () => {
    apiTaklidi.post.mockResolvedValue({ ok: true, veri: { favoriMi: true } });
    useFavoriler.setState({
      mekanlar: [{ ...MEKAN, id: "m2", ad: "Başka" }],
      idler: new Set(["m2"]),
    });

    await useFavoriler.getState().degistir(MEKAN);

    expect(useFavoriler.getState().mekanlar?.[0].id).toBe("m1");
    expect(useFavoriler.getState().idler.has("m1")).toBe(true);
  });
});
