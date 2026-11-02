import { describe, expect, it } from "vitest";
import {
  ZAMANLI_ISLER,
  isDurumu,
  isSagligi,
  isSorunluMu,
  yedeklemeYonetiliyorMu,
} from "./isler";

const kvkk = ZAMANLI_ISLER[0];
const simdi = new Date("2026-08-11T10:00:00Z");

function saatOnce(saat: number): Date {
  return new Date(simdi.getTime() - saat * 3_600_000);
}

describe("zamanlanmış iş durumu", () => {
  it("hiç çalışmadıysa uyarır", () => {
    // En sinsi hâl bu: cron kurulmamış, hata da yok, kimse fark etmiyor.
    expect(isDurumu(kvkk, null, simdi)).toBe("hic");
  });

  it("beklenen aralıkta çalıştıysa sağlıklı sayar", () => {
    expect(
      isDurumu(kvkk, { finishedAt: saatOnce(6), ok: true, detail: null }, simdi),
    ).toBe("calisti");
  });

  it("beklenen aralığı aşmışsa gecikmiş sayar", () => {
    expect(
      isDurumu(
        kvkk,
        { finishedAt: saatOnce(kvkk.beklenenSaat + 1), ok: true, detail: null },
        simdi,
      ),
    ).toBe("gecikti");
  });

  it("son çalışma hata verdiyse tarihi taze olsa da hatalı sayar", () => {
    expect(
      isDurumu(kvkk, { finishedAt: saatOnce(1), ok: false, detail: "disk dolu" }, simdi),
    ).toBe("hatali");
  });

  it("başlayıp bitmemiş çalışma sağlıklı sayılmaz", () => {
    // Süreç ortada öldüyse kayıt yarım kalır; bunu "çalıştı" saymak
    // yedeğin alındığı yanılgısını üretir.
    expect(isDurumu(kvkk, { finishedAt: null, ok: false, detail: null }, simdi)).toBe(
      "hatali",
    );
  });
});

describe("yönetilen yedekleme (Neon)", () => {
  const yedek = ZAMANLI_ISLER.find((i) => i.ad === "yedekle")!;

  it("Neon adresini tanır, adresin kendisine başka bir şey sormaz", () => {
    expect(yedeklemeYonetiliyorMu("postgresql://u:p@ep-x-1.c-4.us-east-2.aws.neon.tech/db")).toBe(
      true,
    );
    expect(yedeklemeYonetiliyorMu("postgresql://u:p@localhost:5432/db")).toBe(false);
    // Ad içinde geçmesi yetmez; sunucu adı Neon'un alanında bitmeli.
    expect(yedeklemeYonetiliyorMu("postgresql://u:p@neon.tech.saldirgan.com/db")).toBe(false);
  });

  it("emin olunamayan adreste 'bizim işimiz' sayar", () => {
    expect(yedeklemeYonetiliyorMu(undefined)).toBe(false);
    expect(yedeklemeYonetiliyorMu("bozuk adres")).toBe(false);
  });

  it("Neon'da hiç çalışmamış yedek hata değil, 'yönetiliyor'", () => {
    const durum = isSagligi(yedek, null, { yedeklemeYonetiliyor: true }, simdi);
    expect(durum).toBe("yonetiliyor");
    expect(isSorunluMu(durum)).toBe(false);
  });

  it("elle çalıştırılıp hata vermişse yine gösterilir", () => {
    expect(
      isSagligi(
        yedek,
        { finishedAt: simdi, ok: false, detail: "pg_dump yok" },
        { yedeklemeYonetiliyor: true },
        simdi,
      ),
    ).toBe("hatali");
  });

  it("diğer işler bu kuraldan etkilenmez", () => {
    expect(isSagligi(kvkk, null, { yedeklemeYonetiliyor: true }, simdi)).toBe("hic");
    expect(isSorunluMu("hic")).toBe(true);
  });
});
