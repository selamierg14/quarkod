import { describe, expect, it } from "vitest";
import {
  eslesenTalebiBul,
  hedefDoluMu,
  talepDurumunuBelirle,
  type BekleyenDegisimTalebi,
} from "./vardiya-degisim";

const PZT = new Date(2026, 8, 7); // Pazartesi
const SALI = new Date(2026, 8, 8);

function talep(kismi: Partial<BekleyenDegisimTalebi> & { id: string }): BekleyenDegisimTalebi {
  return {
    requestedById: `user-${kismi.id}`,
    businessId: "biz-1",
    kaynakTarih: PZT,
    kaynakVardiya: "sabah",
    hedefTarih: null,
    hedefVardiya: null,
    ...kismi,
  };
}

describe("eslesenTalebiBul", () => {
  it("A sabahtan akşama, B akşamdan sabaha isterse eşleşir (aynı gün)", () => {
    const a = talep({ id: "a", kaynakVardiya: "sabah", hedefTarih: PZT, hedefVardiya: "aksam" });
    const b = talep({
      id: "b",
      kaynakTarih: PZT,
      kaynakVardiya: "aksam",
      hedefTarih: PZT,
      hedefVardiya: "sabah",
    });
    expect(eslesenTalebiBul(a, [b])?.id).toBe("b");
    expect(eslesenTalebiBul(b, [a])?.id).toBe("a");
  });

  it("pazartesi izinli biri salıyı, salı izinli biri pazartesiyi isterse eşleşir", () => {
    const a = talep({
      id: "a",
      kaynakTarih: PZT,
      kaynakVardiya: "sabah",
      hedefTarih: SALI,
      hedefVardiya: "sabah",
    });
    const b = talep({
      id: "b",
      kaynakTarih: SALI,
      kaynakVardiya: "sabah",
      hedefTarih: PZT,
      hedefVardiya: "sabah",
    });
    expect(eslesenTalebiBul(a, [b])?.id).toBe("b");
  });

  it("tek yönlü istek (karşı tarafta ters talep yok) eşleşmez", () => {
    const a = talep({ id: "a", hedefTarih: PZT, hedefVardiya: "aksam" });
    const b = talep({ id: "b", kaynakTarih: SALI, hedefTarih: PZT, hedefVardiya: "sabah" });
    expect(eslesenTalebiBul(a, [b])).toBeNull();
  });

  it("hedefsiz (bırakma) talebi asla eşleşmez", () => {
    const a = talep({ id: "a" }); // hedefsiz
    const b = talep({
      id: "b",
      kaynakTarih: PZT,
      kaynakVardiya: "sabah",
      hedefTarih: PZT,
      hedefVardiya: "sabah",
    });
    expect(eslesenTalebiBul(a, [b])).toBeNull();
  });

  it("aynı kişinin iki talebi birbiriyle eşleşmez", () => {
    const a = talep({
      id: "a",
      requestedById: "user-x",
      hedefTarih: PZT,
      hedefVardiya: "aksam",
    });
    const b = talep({
      id: "b",
      requestedById: "user-x",
      kaynakTarih: PZT,
      kaynakVardiya: "aksam",
      hedefTarih: PZT,
      hedefVardiya: "sabah",
    });
    expect(eslesenTalebiBul(a, [b])).toBeNull();
  });
});

describe("hedefDoluMu", () => {
  const a = talep({
    id: "a",
    requestedById: "user-a",
    hedefTarih: PZT,
    hedefVardiya: "aksam",
  });

  it("hedef günde/vardiyada başkası çalışıyorsa dolu", () => {
    expect(
      hedefDoluMu(a, [{ businessId: "biz-1", userId: "user-b", date: PZT, shift: "aksam" }]),
    ).toBe(true);
  });

  it("hedef boşsa dolu değil", () => {
    expect(hedefDoluMu(a, [])).toBe(false);
  });

  it("hedefte çalışan TALEP EDENİN KENDİSİYSE dolu sayılmaz", () => {
    expect(
      hedefDoluMu(a, [{ businessId: "biz-1", userId: "user-a", date: PZT, shift: "aksam" }]),
    ).toBe(false);
  });

  it("hedefsiz talep asla dolu sayılmaz", () => {
    expect(
      hedefDoluMu(talep({ id: "b" }), [
        { businessId: "biz-1", userId: "user-x", date: PZT, shift: "sabah" },
      ]),
    ).toBe(false);
  });
});

describe("talepDurumunuBelirle", () => {
  it("hedefsizse 'hedefsiz' döner", () => {
    expect(talepDurumunuBelirle(talep({ id: "a" }), [], [])).toEqual({ tur: "hedefsiz" });
  });

  it("eşleşme varsa 'eslesti' döner, hedef dolu bile olsa", () => {
    const a = talep({ id: "a", hedefTarih: PZT, hedefVardiya: "aksam" });
    const b = talep({
      id: "b",
      requestedById: "user-b",
      kaynakTarih: PZT,
      kaynakVardiya: "aksam",
      hedefTarih: PZT,
      hedefVardiya: "sabah",
    });
    const atamalar = [{ businessId: "biz-1", userId: "user-b", date: PZT, shift: "aksam" }];
    expect(talepDurumunuBelirle(a, [b], atamalar)).toEqual({ tur: "eslesti", digerTalepId: "b" });
  });

  it("eşleşme yok, hedef boşsa 'hedefBos' döner", () => {
    const a = talep({ id: "a", hedefTarih: PZT, hedefVardiya: "aksam" });
    expect(talepDurumunuBelirle(a, [], [])).toEqual({ tur: "hedefBos" });
  });

  it("eşleşme yok, hedef doluysa 'hedefDolu' döner", () => {
    const a = talep({ id: "a", requestedById: "user-a", hedefTarih: PZT, hedefVardiya: "aksam" });
    const atamalar = [{ businessId: "biz-1", userId: "user-c", date: PZT, shift: "aksam" }];
    expect(talepDurumunuBelirle(a, [], atamalar)).toEqual({ tur: "hedefDolu" });
  });
});
