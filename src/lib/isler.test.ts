import { describe, expect, it } from "vitest";
import { ZAMANLI_ISLER, isDurumu } from "./isler";

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
