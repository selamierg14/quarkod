import { describe, it, expect } from "vitest";
import { yonetebilirMi, acilabilirRoller } from "./panel";
import { userScopeFor, IMPOSSIBLE_ID } from "./tenancy";
import { ROLLER, type Role } from "./session-token";

/**
 * Yetki yükseltmeye karşı gerileme testleri.
 *
 * Bu dosyanın varlık sebebi somut bir zafiyet: kullanıcı düzenleme, şifre
 * sıfırlama ve pasife alma eylemleri yalnızca `userScope` filtresine
 * güveniyordu ve o filtre bölge müdürünü hesabın TAMAMINA açıyordu. Zincir
 * şuydu:
 *
 *   bölge müdürü → patronun şifresini sıfırla → patron olarak giriş yap
 *
 * İki bağımsız savunma eklendi (biri delinse diğeri tutsun):
 *   1. Kıdem kapısı — yonetebilirMi()
 *   2. Kapsam daraltma — userScopeFor(), bolge dalı
 */

describe("kıdem kapısı (yonetebilirMi)", () => {
  it("bölge müdürü patronu YÖNETEMEZ", () => {
    // Zafiyetin ta kendisi: bu satır false dönmezse hesap devralınabilir.
    expect(yonetebilirMi("bolge", "owner")).toBe(false);
  });

  it("bölge müdürü kendine eş ya da üst rolleri yönetemez", () => {
    expect(yonetebilirMi("bolge", "bolge")).toBe(false);
    expect(yonetebilirMi("bolge", "manager")).toBe(false);
    expect(yonetebilirMi("bolge", "superadmin")).toBe(false);
  });

  it("bölge müdürü yalnızca garsonu yönetebilir", () => {
    expect(yonetebilirMi("bolge", "garson")).toBe(true);
  });

  it("işletme sorumlusu da yalnızca garsonu yönetebilir", () => {
    expect(yonetebilirMi("manager", "garson")).toBe(true);
    expect(yonetebilirMi("manager", "owner")).toBe(false);
    expect(yonetebilirMi("manager", "manager")).toBe(false);
    expect(yonetebilirMi("manager", "bolge")).toBe(false);
  });

  it("patron ekibini yönetir ama ikinci bir patrona dokunamaz", () => {
    expect(yonetebilirMi("owner", "bolge")).toBe(true);
    expect(yonetebilirMi("owner", "manager")).toBe(true);
    expect(yonetebilirMi("owner", "garson")).toBe(true);
    // Sahiplik aboneliği taşıyan rol; platform tarafının işi.
    expect(yonetebilirMi("owner", "owner")).toBe(false);
    expect(yonetebilirMi("owner", "superadmin")).toBe(false);
  });

  it("garson hiç kimseyi yönetemez", () => {
    for (const rol of ROLLER) expect(yonetebilirMi("garson", rol)).toBe(false);
  });

  it("tanınmayan rolü reddeder", () => {
    // Veritabanına elle yazılmış ya da eski bir rol, sessizce geçmemeli.
    expect(yonetebilirMi("owner", "root")).toBe(false);
    expect(yonetebilirMi("owner", "")).toBe(false);
  });

  it("kural acilabilirRoller ile aynı kaynaktan gelir", () => {
    // İki liste ayrışırsa "açabildiğin rolü yönetebilirsin" ilkesi bozulur.
    for (const actor of ROLLER) {
      for (const target of ROLLER) {
        expect(yonetebilirMi(actor, target)).toBe(
          acilabilirRoller(actor).includes(target as Role),
        );
      }
    }
  });
});

describe("kullanıcı kapsamı (userScopeFor)", () => {
  const bolge = { role: "bolge" as Role, accountId: "hesap-1", businessId: null };

  it("bölge müdürünün kapsamı ATANMIŞ işletmelerle sınırlı", () => {
    // Önceden burası { accountId: "hesap-1" } dönüyordu; yani hesaptaki
    // her kullanıcı — patron dahil — bu filtreye giriyordu.
    expect(userScopeFor(bolge, ["biz-1", "biz-2"])).toEqual({
      businessId: { in: ["biz-1", "biz-2"] },
    });
  });

  it("kapsam hiçbir zaman hesabın tamamına açılmaz", () => {
    const kapsam = userScopeFor(bolge, ["biz-1"]);
    expect(kapsam).not.toHaveProperty("accountId");
  });

  it("atama yoksa hiçbir kaydı eşleştirmez", () => {
    // Boş `where` Prisma'da "hepsi" demek; sızıntının en olası yolu bu.
    expect(userScopeFor(bolge, [])).toEqual({ businessId: { in: [IMPOSSIBLE_ID] } });
  });

  it("işletme sorumlusu kendi işletmesiyle sınırlı kalır", () => {
    expect(
      userScopeFor({ role: "manager", accountId: "hesap-1", businessId: "biz-9" }),
    ).toEqual({ businessId: "biz-9" });
  });

  it("patron kendi hesabıyla sınırlı", () => {
    expect(
      userScopeFor({ role: "owner", accountId: "hesap-1", businessId: null }),
    ).toEqual({ accountId: "hesap-1" });
  });

  it("hesabı olmayan patron hiçbir kaydı görmez", () => {
    expect(
      userScopeFor({ role: "owner", accountId: null, businessId: null }),
    ).toEqual({ accountId: IMPOSSIBLE_ID });
  });
});
