import { describe, expect, it } from "vitest";
import { buildFeedbackWhere, toCsv } from "./feedback-filters";

const ALLOWED = ["isletme-a", "isletme-b"];

describe("buildFeedbackWhere — yetki sınırı", () => {
  it("filtre yokken sadece izin verilen işletmeleri kapsar", () => {
    const where = buildFeedbackWhere({}, ALLOWED);
    expect(where.businessId).toEqual({ in: ALLOWED });
  });

  it("izin verilen bir işletmeye daraltılabilir", () => {
    const where = buildFeedbackWhere({ isletme: "isletme-b" }, ALLOWED);
    expect(where.businessId).toEqual({ in: ["isletme-b"] });
  });

  it("izinsiz işletme kimliği verilirse kapsam genişlemez", () => {
    // Sorumlunun adres çubuğuna başka bir kimlik yazması bu şekilde etkisiz kalır.
    const where = buildFeedbackWhere({ isletme: "baskasinin-isletmesi" }, ALLOWED);
    expect(where.businessId).toEqual({ in: ALLOWED });
  });

  it("tek işletmeli sorumlu için kapsam tek işletmedir", () => {
    const where = buildFeedbackWhere({ isletme: "isletme-a" }, ["isletme-a"]);
    expect(where.businessId).toEqual({ in: ["isletme-a"] });
  });
});

describe("buildFeedbackWhere — puan filtresi", () => {
  it("düşük ve yüksek grupları doğru aralığa çevirir", () => {
    expect(buildFeedbackWhere({ puan: "dusuk" }, ALLOWED).overallRating).toEqual({
      lte: 3,
    });
    expect(buildFeedbackWhere({ puan: "yuksek" }, ALLOWED).overallRating).toEqual({
      gte: 4,
    });
  });

  it("tek yıldız seçimi tam eşleşme olur", () => {
    expect(buildFeedbackWhere({ puan: "2" }, ALLOWED).overallRating).toBe(2);
  });

  it("geçersiz puan değeri filtre kurmaz", () => {
    expect(buildFeedbackWhere({ puan: "9" }, ALLOWED).overallRating).toBeUndefined();
    expect(
      buildFeedbackWhere({ puan: "'; DROP TABLE" }, ALLOWED).overallRating,
    ).toBeUndefined();
  });
});

describe("buildFeedbackWhere — arama", () => {
  it("hem katlanmış hem ham yorumda arar", () => {
    const where = buildFeedbackWhere({ ara: "ŞİKAYET" }, ALLOWED);
    expect(where.OR).toEqual([
      { commentSearch: { contains: "sikayet" } },
      { comment: { contains: "ŞİKAYET" } },
    ]);
  });

  it("arama yoksa OR kurulmaz", () => {
    expect(buildFeedbackWhere({}, ALLOWED).OR).toBeUndefined();
  });
});

describe("buildFeedbackWhere — vardiya ve durum", () => {
  it("vardiya ve durumu birlikte uygular", () => {
    const where = buildFeedbackWhere({ vardiya: "gece", durum: "yeni" }, ALLOWED);
    expect(where.shift).toBe("gece");
    expect(where.status).toBe("yeni");
  });
});

describe("toCsv", () => {
  it("tırnakları kaçırır ve noktalı virgülle ayırır", () => {
    const csv = toCsv([["a", 'b"c'], ["d;e", "f"]]);
    expect(csv).toContain('"b""c"');
    expect(csv).toContain('"d;e"');
  });

  it("Excel'in Türkçe karakterleri bozmaması için BOM ile başlar", () => {
    expect(toCsv([["ş"]]).charCodeAt(0)).toBe(0xfeff);
  });

  it("satırları CRLF ile ayırır", () => {
    expect(toCsv([["a"], ["b"]])).toBe('﻿"a"\r\n"b"');
  });
});
