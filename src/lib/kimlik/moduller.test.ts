import { describe, expect, it } from "vitest";
import {
  MODUL_ANAHTARLARI,
  etkinModuller,
  istenenModulleriSuz,
  modulDagitabilirMi,
  verilebilirModuller,
} from "./moduller";

/**
 * Modül devretme kuralları.
 *
 * Buradaki bir kırmızı, "bir müşteri satın almadığı modülü kendi hesabında
 * açabiliyor" demektir — form alanını gizlemek yeterli değil, istek elle
 * kurulabilir; asıl kapı istenenModulleriSuz().
 */
describe("modül dağıtma yetkisi", () => {
  it("yalnızca platform yöneticisi ve hesap sahibi dağıtabilir", () => {
    expect(modulDagitabilirMi("superadmin")).toBe(true);
    expect(modulDagitabilirMi("owner")).toBe(true);
    expect(modulDagitabilirMi("bolge")).toBe(false);
    expect(modulDagitabilirMi("manager")).toBe(false);
    expect(modulDagitabilirMi("garson")).toBe(false);
  });

  it("dağıtamayan rol için verilebilir liste boştur", () => {
    // Bölge müdürünün kendi modülleri olsa bile ekibine dağıtamaz.
    expect(verilebilirModuller("manager", MODUL_ANAHTARLARI)).toEqual([]);
    expect(verilebilirModuller("bolge", ["menu", "anket"])).toEqual([]);
  });
});

describe("etkin modüller", () => {
  it("platform yöneticisi listeden bağımsız hepsine erişir", () => {
    expect([...etkinModuller("superadmin", [])].sort()).toEqual(
      [...MODUL_ANAHTARLARI].sort(),
    );
  });

  it("diğer roller yalnızca kendi listesine erişir", () => {
    expect([...etkinModuller("owner", ["menu"])]).toEqual(["menu"]);
    expect([...etkinModuller("manager", [])]).toEqual([]);
  });

  it("tanınmayan anahtar sessizce atılır", () => {
    // Eski/yanlış bir değer veritabanında kalmışsa erişim açmamalı.
    expect([...etkinModuller("owner", ["menu", "uydurma-modul"])]).toEqual(["menu"]);
  });
});

describe("istenen modülleri süzme", () => {
  it("hesap sahibi sahip olmadığı modülü veremez", () => {
    // Patronda yalnızca "menu" var; forma "iys" de eklense geçmemeli.
    expect(istenenModulleriSuz("owner", ["menu"], ["menu", "iys"])).toEqual(["menu"]);
  });

  it("dağıtma yetkisi olmayan hiçbir şey veremez", () => {
    expect(istenenModulleriSuz("manager", MODUL_ANAHTARLARI, ["menu"])).toEqual([]);
  });

  it("uydurma anahtar geçmez", () => {
    expect(istenenModulleriSuz("superadmin", [], ["menu", "root", ""])).toEqual(["menu"]);
  });

  it("tekrar eden anahtar bir kez yazılır", () => {
    expect(istenenModulleriSuz("superadmin", [], ["menu", "menu"])).toEqual(["menu"]);
  });

  it("platform yöneticisi hepsini verebilir", () => {
    expect(istenenModulleriSuz("superadmin", [], [...MODUL_ANAHTARLARI]).sort()).toEqual(
      [...MODUL_ANAHTARLARI].sort(),
    );
  });
});
