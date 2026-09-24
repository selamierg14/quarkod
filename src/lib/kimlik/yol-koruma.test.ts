import { describe, it, expect } from "vitest";
import { yolKarari } from "./yol-koruma";

/**
 * Bu testlerin çekirdeği tek bir iddia: tüketici API'si ASLA panelin çerez
 * kapısına düşmemeli — ne geliştirmede ne üretimde.
 *
 * Regresyon: `/api/app/*` dalı `NODE_ENV === "development"` koşuluna bağlıydı
 * ve üretimde istek panelin oturum kapısına düşüp `/admin/giris`'e
 * yönleniyordu. Geliştirmede erken `return` yüzünden hata hiç görünmüyordu.
 */

describe("yolKarari — tüketici API'si", () => {
  const appYollari = [
    "/api/app/mekanlar",
    "/api/app/mekanlar/ada-kahvesi",
    "/api/app/giris",
    "/api/app/ziyaret",
    "/api/app/cuzdan",
    "/api/app",
  ];

  it("ÜRETİMDE panel oturumu istemez", () => {
    for (const yol of appYollari) {
      const karar = yolKarari(yol, false);
      expect(karar.tur, yol).toBe("appApi");
    }
  });

  it("geliştirmede de panel oturumu istemez", () => {
    for (const yol of appYollari) {
      expect(yolKarari(yol, true).tur, yol).toBe("appApi");
    }
  });

  it("CORS yalnızca geliştirmede açılır", () => {
    const gelistirme = yolKarari("/api/app/mekanlar", true);
    const uretim = yolKarari("/api/app/mekanlar", false);
    expect(gelistirme).toEqual({ tur: "appApi", corsGerekli: true });
    // Üretimde uçları başka kökenlere açmanın karşılığı yok.
    expect(uretim).toEqual({ tur: "appApi", corsGerekli: false });
  });
});

describe("yolKarari — panel", () => {
  it("giriş sayfası serbest — yoksa yönlendirme döngüsü olur", () => {
    expect(yolKarari("/admin/giris", false)).toEqual({ tur: "serbest" });
  });

  it("panelin geri kalanı oturum ister", () => {
    for (const yol of [
      "/admin",
      "/admin/kullanicilar",
      "/admin/rezervasyon/plan",
      "/admin/isletmeler/abc/masalar",
    ]) {
      expect(yolKarari(yol, false).tur, yol).toBe("oturumGerekli");
    }
  });

  it("ortam panel kararını değiştirmez", () => {
    expect(yolKarari("/admin", true).tur).toBe("oturumGerekli");
    expect(yolKarari("/admin", false).tur).toBe("oturumGerekli");
  });
});

describe("yolKarari — sınır durumları", () => {
  it("benzer ama farklı yollar tüketici API'si sayılmaz", () => {
    // "/api/apple" gibi bir yol öneki paylaşıyor ama bizim ucumuz değil;
    // yanlışlıkla korumasız bırakılmamalı.
    expect(yolKarari("/api/apple", false).tur).toBe("oturumGerekli");
    expect(yolKarari("/api/appx/y", false).tur).toBe("oturumGerekli");
  });

  it("giriş sayfasının altındaki yollar serbest değil", () => {
    expect(yolKarari("/admin/giriss", false).tur).toBe("oturumGerekli");
    expect(yolKarari("/admin/giris/kod", false).tur).toBe("oturumGerekli");
  });
});
