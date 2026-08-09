import { describe, expect, it } from "vitest";
import { toSmsNumber } from "./sms";
import { maskPhone } from "./otp";

describe("toSmsNumber", () => {
  it("sağlayıcının beklediği sayı biçimini üretir", () => {
    // ekomesaj gövdesinde number alanı tırnaksız sayıdır: 905364901001
    expect(toSmsNumber("+905364901001")).toBe(905364901001);
    expect(toSmsNumber("0536 490 10 01")).toBe(905364901001);
    expect(toSmsNumber("5364901001")).toBe(905364901001);
  });

  it("geçersiz numarada null döner — hatalı istek göndermeyiz", () => {
    expect(toSmsNumber("0212 111 22 33")).toBeNull();
    expect(toSmsNumber("abc")).toBeNull();
  });
});

describe("maskPhone", () => {
  it("yalnızca son haneleri gösterir", () => {
    const masked = maskPhone("+905364901001");
    expect(masked).toContain("10 01");
    // Ortadaki haneler sızmamalı: ekranı gören biri numarayı öğrenmesin.
    expect(masked).not.toContain("5364");
  });
});
