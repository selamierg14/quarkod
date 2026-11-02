import { describe, expect, it } from "vitest";
import {
  acikSaglayicilar,
  adiSadelestir,
  gecerliSaglayiciMi,
  kimlikJetonunuDogrula,
  kimlikleriCoz,
  kimligeCevir,
  kullaniciAdiUret,
  saglayiciKimlikleri,
} from "./sosyal-giris";

describe("yapılandırma", () => {
  it("virgüllü listeyi ayrıştırır, boşlukları atar", () => {
    expect(kimlikleriCoz(" a.apps , b.apps ,, ")).toEqual(["a.apps", "b.apps"]);
    expect(kimlikleriCoz(undefined)).toEqual([]);
    expect(kimlikleriCoz("")).toEqual([]);
  });

  it("yalnızca yapılandırılmış sağlayıcı açık", () => {
    expect(acikSaglayicilar({})).toEqual([]);
    expect(acikSaglayicilar({ GOOGLE_ISTEMCI_IDLERI: "x.apps" })).toEqual(["google"]);
    expect(
      acikSaglayicilar({ GOOGLE_ISTEMCI_IDLERI: "x", APPLE_ISTEMCI_IDLERI: "y" }),
    ).toEqual(["google", "apple"]);
  });

  it("sağlayıcı adını doğrular", () => {
    expect(gecerliSaglayiciMi("apple")).toBe(true);
    expect(gecerliSaglayiciMi("facebook")).toBe(false);
  });

  it("her sağlayıcı kendi ortam değişkenini okuyor", () => {
    const ortam = { GOOGLE_ISTEMCI_IDLERI: "g1,g2", APPLE_ISTEMCI_IDLERI: "a1" };
    expect(saglayiciKimlikleri("google", ortam)).toEqual(["g1", "g2"]);
    expect(saglayiciKimlikleri("apple", ortam)).toEqual(["a1"]);
  });
});

describe("kimlikJetonunuDogrula", () => {
  it("sağlayıcı yapılandırılmamışsa ağa hiç çıkmadan reddeder", async () => {
    const sonuc = await kimlikJetonunuDogrula("google", "herhangi.bir.jeton", {});
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("kullanılamıyor");
  });

  it("boş ve aşırı uzun jetonu doğrulamaya sokmaz", async () => {
    const ortam = { GOOGLE_ISTEMCI_IDLERI: "x.apps" };
    expect((await kimlikJetonunuDogrula("google", "", ortam)).ok).toBe(false);
    expect((await kimlikJetonunuDogrula("google", "a".repeat(5000), ortam)).ok).toBe(false);
  });
});

describe("kimligeCevir", () => {
  it("sub'suz jetonu reddeder", () => {
    expect(kimligeCevir("apple", { email: "a@b.com" })).toBeNull();
  });

  it("Apple'ın metin 'true' değerini de doğrulanmış sayar", () => {
    const kimlik = kimligeCevir("apple", {
      sub: "001",
      email: "a@b.com",
      email_verified: "true",
    });
    expect(kimlik).toMatchObject({ sub: "001", eposta: "a@b.com", epostaDogrulandi: true });
  });

  it("doğrulanmamış e-postayı işaretler", () => {
    const kimlik = kimligeCevir("google", { sub: "1", email: "a@b.com" });
    expect(kimlik?.epostaDogrulandi).toBe(false);
  });

  it("e-posta yoksa null taşır (Apple gizli adres vermeyebiliyor)", () => {
    expect(kimligeCevir("apple", { sub: "1" })?.eposta).toBeNull();
    expect(kimligeCevir("apple", { sub: "1", email: "bozuk" })?.eposta).toBeNull();
  });
});

describe("adiSadelestir", () => {
  it("Türkçe harfleri karşılığına çevirir", () => {
    expect(adiSadelestir("Ayşe Yılmaz")).toBe("ayseyilmaz");
    expect(adiSadelestir("Çiğdem Öz")).toBe("cigdemoz");
  });

  it("harf ve rakam dışını atar, uzunluğu sınırlar", () => {
    expect(adiSadelestir("a.b-c_d 42")).toBe("abcd42");
    expect(adiSadelestir("x".repeat(40))).toHaveLength(16);
  });

  it("hiç harf yoksa boş döner", () => {
    expect(adiSadelestir("🙂 ***")).toBe("");
  });
});

describe("kullaniciAdiUret", () => {
  it("boştaki adı olduğu gibi verir", () => {
    expect(kullaniciAdiUret("Ayşe Yılmaz", () => false)).toBe("ayseyilmaz");
  });

  it("çakışmada sayı ekler", () => {
    const alinmis = new Set(["ayseyilmaz", "ayseyilmaz2"]);
    expect(kullaniciAdiUret("Ayşe Yılmaz", (a) => alinmis.has(a))).toBe("ayseyilmaz3");
  });

  it("ad kullanılamaz durumdaysa varsayılan tabana düşer", () => {
    expect(kullaniciAdiUret("🙂", () => false)).toBe("kasif");
  });

  it("taban ve sayılar doluyken rastgele eke geçer", () => {
    const alinmis = new Set(["kasif", ...Array.from({ length: 19 }, (_, i) => `kasif${i + 2}`)]);
    const ad = kullaniciAdiUret("kasif", (a) => alinmis.has(a), () => 0.5);
    expect(ad).toBe("kasif550000");
  });

  it("hiçbir aday boş değilse hata fırlatır (sessizce çakışan ad üretmez)", () => {
    expect(() => kullaniciAdiUret("kasif", () => true)).toThrow();
  });
});
