import { describe, expect, it } from "vitest";
import { plusGecerliMi } from "./biyerlere-plus";

/**
 * Plus üyeliğinin "geçerli" tanımı: `plusUyeMi` tek başına yetmiyor,
 * `plusBitis` geçmişse üyelik bitmiş sayılmalı — superadmin bayrağı
 * kapatmayı unutsa bile.
 */
describe("plusGecerliMi", () => {
  const simdi = new Date(2026, 8, 2);

  it("plusUyeMi false ise her zaman geçersiz", () => {
    expect(plusGecerliMi({ plusUyeMi: false, plusBitis: null }, simdi)).toBe(false);
  });

  it("plusUyeMi true ve bitiş yoksa (süresiz) geçerli", () => {
    expect(plusGecerliMi({ plusUyeMi: true, plusBitis: null }, simdi)).toBe(true);
  });

  it("bitiş gelecekteyse geçerli", () => {
    expect(
      plusGecerliMi({ plusUyeMi: true, plusBitis: new Date(2026, 8, 10) }, simdi),
    ).toBe(true);
  });

  it("bitiş geçmişteyse geçersiz — plusUyeMi hâlâ true olsa bile", () => {
    expect(
      plusGecerliMi({ plusUyeMi: true, plusBitis: new Date(2026, 7, 20) }, simdi),
    ).toBe(false);
  });
});
