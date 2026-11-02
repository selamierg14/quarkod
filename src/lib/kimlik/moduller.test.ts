import { describe, expect, it } from "vitest";
import {
  MODULLER,
  MODUL_ANAHTARLARI,
  etkinModuller,
  istenenModulleriSuz,
  modulDagitabilirMi,
  modulleriGuncelleMeli,
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

describe("modulleriGuncelleMeli", () => {
  it("yetkili rol + form gönderdi → günceller", () => {
    expect(modulleriGuncelleMeli("superadmin", true)).toBe(true);
    expect(modulleriGuncelleMeli("owner", true)).toBe(true);
  });

  it("form modül bloğunu GÖNDERMEDİYSE dokunmaz", () => {
    // Asıl düzeltilen veri kaybı: blok arayüzde gizliyken formu kaydetmek
    // hedefin tüm modüllerini siliyordu.
    expect(modulleriGuncelleMeli("superadmin", false)).toBe(false);
    expect(modulleriGuncelleMeli("owner", false)).toBe(false);
  });

  it("dağıtma yetkisi olmayan rol hiçbir durumda değiştiremez", () => {
    for (const rol of ["manager", "bolge", "garson"] as const) {
      expect(modulleriGuncelleMeli(rol, true), rol).toBe(false);
      expect(modulleriGuncelleMeli(rol, false), rol).toBe(false);
    }
  });
});

describe("patron modül alabilir", () => {
  it("superadmin patrona her modülü verebilir", () => {
    // "Patrona modül izni veremiyorum" şikayetinin kök nedeni arayüzdeydi
    // (modül bloğu owner hedefinde gizleniyordu); kural katmanı buna
    // baştan izin veriyordu ve bu test onu sabitliyor.
    const verilebilir = verilebilirModuller("superadmin", []);
    expect(verilebilir).toContain("rezervasyon");
    expect(verilebilir).toEqual(MODUL_ANAHTARLARI);
  });

  it("rezervasyon modülü listede", () => {
    expect(MODUL_ANAHTARLARI).toContain("rezervasyon");
    expect(MODULLER.rezervasyon).toBe("Rezervasyon");
  });
});
