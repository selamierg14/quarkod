import { describe, it, expect } from "vitest";
import {
  SINIRLAR,
  hizSiniriKontrolFor,
  hizSiniriIsaretleFor,
  hizSiniriUygulaFor,
  hizSiniriMesaji,
} from "./hiz-siniri";

/**
 * Sahte sayaç deposu — gerçek veritabanına gitmeden pencere mantığını
 * sınayabilmek için. Testin ölçtüğü şey SQL değil, karar kuralı.
 */
function sahteDepo(baslangic: { anahtar: string; zaman: Date }[] = []) {
  const kayitlar = [...baslangic];
  return {
    kayitlar,
    loginAttempt: {
      count: async (args: unknown) => {
        const a = args as { where: { email: string; createdAt: { gte: Date } } };
        return kayitlar.filter(
          (k) => k.anahtar === a.where.email && k.zaman >= a.where.createdAt.gte,
        ).length;
      },
      findFirst: async (args: unknown) => {
        const a = args as { where: { email: string; createdAt: { gte: Date } } };
        const eslesen = kayitlar
          .filter((k) => k.anahtar === a.where.email && k.zaman >= a.where.createdAt.gte)
          .sort((x, y) => x.zaman.getTime() - y.zaman.getTime());
        return eslesen[0] ? { createdAt: eslesen[0].zaman } : null;
      },
      create: async (args: unknown) => {
        const a = args as { data: { email: string } };
        kayitlar.push({ anahtar: a.data.email, zaman: new Date() });
        return {};
      },
    },
  };
}

const SINIR = { kanal: "deneme", adet: 3, dakika: 10 };

describe("hız sınırı", () => {
  it("kota dolana kadar izin verir", async () => {
    const depo = sahteDepo();
    for (let i = 0; i < SINIR.adet; i++) {
      expect((await hizSiniriUygulaFor(depo, SINIR, "ip_x")).izin).toBe(true);
    }
  });

  it("kota dolduğunda reddeder ve kalan süreyi söyler", async () => {
    const depo = sahteDepo();
    for (let i = 0; i < SINIR.adet; i++) await hizSiniriUygulaFor(depo, SINIR, "ip_x");

    const karar = await hizSiniriUygulaFor(depo, SINIR, "ip_x");
    expect(karar.izin).toBe(false);
    if (!karar.izin) {
      expect(karar.kalanDakika).toBeGreaterThan(0);
      expect(karar.kalanDakika).toBeLessThanOrEqual(SINIR.dakika);
    }
  });

  it("reddedilen istek sayacı ŞİŞİRMEZ", async () => {
    // Aksi halde sınıra takılan biri kendi kilidini sonsuza kadar uzatırdı.
    const depo = sahteDepo();
    for (let i = 0; i < SINIR.adet; i++) await hizSiniriUygulaFor(depo, SINIR, "ip_x");
    const oncekiAdet = depo.kayitlar.length;

    await hizSiniriUygulaFor(depo, SINIR, "ip_x");
    await hizSiniriUygulaFor(depo, SINIR, "ip_x");

    expect(depo.kayitlar.length).toBe(oncekiAdet);
  });

  it("farklı kimlikler birbirinin kotasını yemez", async () => {
    const depo = sahteDepo();
    for (let i = 0; i < SINIR.adet; i++) await hizSiniriUygulaFor(depo, SINIR, "ip_a");

    expect((await hizSiniriUygulaFor(depo, SINIR, "ip_a")).izin).toBe(false);
    expect((await hizSiniriUygulaFor(depo, SINIR, "ip_b")).izin).toBe(true);
  });

  it("farklı kanallar ayrı sayılır", async () => {
    const depo = sahteDepo();
    const a = { kanal: "kayit", adet: 2, dakika: 10 };
    const b = { kanal: "metrik", adet: 2, dakika: 10 };
    await hizSiniriUygulaFor(depo, a, "ip_x");
    await hizSiniriUygulaFor(depo, a, "ip_x");

    expect((await hizSiniriUygulaFor(depo, a, "ip_x")).izin).toBe(false);
    expect((await hizSiniriUygulaFor(depo, b, "ip_x")).izin).toBe(true);
  });

  it("pencere dışındaki eski kayıtlar sayılmaz", async () => {
    const eski = new Date(Date.now() - 60 * 60 * 1000);
    const depo = sahteDepo([
      { anahtar: "deneme:ip_x", zaman: eski },
      { anahtar: "deneme:ip_x", zaman: eski },
      { anahtar: "deneme:ip_x", zaman: eski },
    ]);
    expect((await hizSiniriUygulaFor(depo, SINIR, "ip_x")).izin).toBe(true);
  });

  it("kimlik okunamazsa sınır uygulanmaz", async () => {
    // Tüm anonim istekleri tek kovaya düşürmek, kullanıcıları birbirinin
    // kotasından sorumlu tutmak olurdu.
    const depo = sahteDepo();
    for (let i = 0; i < 50; i++) {
      expect((await hizSiniriUygulaFor(depo, SINIR, "")).izin).toBe(true);
    }
    expect(depo.kayitlar).toHaveLength(0);
  });

  it("kontrol sayacı artırmaz, işaretle artırır", async () => {
    // Kupon ucu yalnızca HATALI denemeleri sayabilsin diye ikisi ayrı.
    const depo = sahteDepo();
    await hizSiniriKontrolFor(depo, SINIR, "ip_x");
    expect(depo.kayitlar).toHaveLength(0);

    await hizSiniriIsaretleFor(depo, SINIR, "ip_x");
    expect(depo.kayitlar).toHaveLength(1);
  });

  it("giriş sayaçlarıyla çakışmaz", async () => {
    // login-guard düz e-posta arıyor; buradaki anahtarlarda hep ":" var.
    const depo = sahteDepo();
    await hizSiniriUygulaFor(depo, SINIR, "ip_x");
    expect(depo.kayitlar[0].anahtar).toContain(":");
    expect(depo.kayitlar[0].anahtar).not.toMatch(/^[^:]+@[^:]+$/);
  });

  it("tanımlı sınırların hepsi makul", () => {
    for (const [ad, sinir] of Object.entries(SINIRLAR)) {
      expect(sinir.adet, ad).toBeGreaterThan(0);
      expect(sinir.dakika, ad).toBeGreaterThan(0);
      expect(sinir.kanal, ad).not.toContain(":");
    }
  });

  it("hata mesajı kalan süreyi içerir", () => {
    expect(hizSiniriMesaji({ izin: false, kalanDakika: 7 })).toContain("7 dakika");
  });
});
