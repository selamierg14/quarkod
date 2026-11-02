import { describe, expect, it } from "vitest";
import { denetimKapsami } from "./denetim";

/**
 * Denetim kaydında hiyerarşi tek yönlüdür: üst katman alta bakabilir, alt
 * katman üste bakamaz. Buradaki bir kırmızı, müşterinin bizim iç
 * işlemlerimizi (hesabını askıya alma, aboneliğini değiştirme, hesabına
 * girip çıkma) okuyabildiği anlamına gelir.
 */
describe("denetim kaydı kapsamı", () => {
  it("platform yöneticisi hesap seçmediyse her şeyi görür", () => {
    expect(denetimKapsami("superadmin", null, null)).toEqual({});
  });

  it("hesap sahibi platform işlemlerini görmez", () => {
    const kapsam = denetimKapsami("owner", null, "hesap-1");
    expect(kapsam).toEqual({
      accountId: "hesap-1",
      NOT: { actorRole: "superadmin" },
    });
  });

  it("hesap sahibi başka hesabın kaydını göremez", () => {
    const kapsam = denetimKapsami("owner", null, "hesap-1");
    expect(kapsam).toMatchObject({ accountId: "hesap-1" });
  });

  it("platform yöneticisi bir hesaba girdiğinde o hesabın gördüğünü görür", () => {
    // Impersonation "müşterinin gözünden bak" demek; kendi izlerimiz de
    // o görünümde saklı kalmalı, yoksa müşteriye anlattığımız ekran
    // gerçekte gördüğünden farklı olur.
    const kapsam = denetimKapsami("superadmin", "hesap-2", null);
    expect(kapsam).toEqual({
      accountId: "hesap-2",
      NOT: { actorRole: "superadmin" },
    });
  });

  it("hesabı olmayan kullanıcı hiçbir kayda ulaşamaz", () => {
    // Boş filtre Prisma'da "hepsi" demektir; kapsam hesaplanamadığında
    // eşleşmeyen bir kimlik koymak tek güvenli davranış.
    expect(denetimKapsami("owner", null, null)).toMatchObject({
      accountId: "__yok__",
    });
  });
});
