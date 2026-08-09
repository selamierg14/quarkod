import { describe, expect, it } from "vitest";
import { normalizePhone, toUsername, usernameProblem } from "./username";

describe("toUsername", () => {
  it("Türkçe karakterleri ASCII'ye indirir", () => {
    expect(toUsername("Şükrü Öztürk")).toBe("sukru.ozturk");
    expect(toUsername("Çağrı")).toBe("cagri");
    expect(toUsername("IŞIK")).toBe("isik");
  });

  it("boşluk ve işaretleri noktaya çevirir, tekrarı sadeleştirir", () => {
    expect(toUsername("ali   veli")).toBe("ali.veli");
    expect(toUsername("a--b__c")).toBe("a.b__c");
  });

  it("baş ve sondaki ayraçları kırpar", () => {
    expect(toUsername("  .ali.  ")).toBe("ali");
  });
});

describe("usernameProblem", () => {
  it("geçerli adı kabul eder", () => {
    expect(usernameProblem("patron")).toBeNull();
    expect(usernameProblem("ege.cunda_1")).toBeNull();
  });

  it("kısa, uzun ve geçersiz karakterli adı reddeder", () => {
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("a".repeat(40))).not.toBeNull();
    // Türkçe karakter bilerek yasak: telefonda ı/i karışması giriş engeller.
    expect(usernameProblem("şükrü")).not.toBeNull();
    expect(usernameProblem("Ali")).not.toBeNull();
    expect(usernameProblem("ali veli")).not.toBeNull();
  });
});

describe("normalizePhone", () => {
  it("yaygın yazımları tek biçime indirir", () => {
    const beklenen = "+905364901001";
    expect(normalizePhone("0536 490 10 01")).toBe(beklenen);
    expect(normalizePhone("5364901001")).toBe(beklenen);
    expect(normalizePhone("+90 536 490 10 01")).toBe(beklenen);
  });

  it("cep olmayanı ve bozuğu reddeder", () => {
    expect(normalizePhone("0212 111 22 33")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});
