import type { PrismaClient } from "@/generated/prisma/client";
import type { Role } from "./session-token";

/**
 * Kiracı izolasyonunun kuralları.
 *
 * Oturumdan ve Next'ten bağımsız tutuldu ki test edilebilsin: buradaki bir hata
 * doğrudan müşteri verisinin sızması demek, o yüzden kuralların tek bir yerde
 * ve testli olması gerekiyor. auth.ts bunları oturumla sarmalar.
 */

/**
 * Hiçbir kaydın eşleşmeyeceği kimlik.
 *
 * Kapsam hesaplanamadığında filtreyi boş bırakmak yerine bunu kullanıyoruz:
 * boş bir `where` Prisma'da "hepsi" demektir ve sızıntının en olası yolu budur.
 */
export const IMPOSSIBLE_ID = "__erisim_yok__";

export type TenantScope = {
  role: Role;
  accountId: string | null;
  businessId: string | null;
  /** Bölge müdürünün işletmeleri bu kimlikten okunur. */
  userId?: string | null;
};

type BusinessReader = Pick<PrismaClient["business"], "findMany" | "findUnique">;
type UserBusinessReader = Pick<PrismaClient["userBusiness"], "findMany">;
type TenantDb = { business: BusinessReader; userBusiness?: UserBusinessReader };

/** Bölge müdürüne atanmış işletmeler. */
async function bolgeIsletmeleri(
  db: TenantDb,
  scope: TenantScope,
): Promise<string[]> {
  if (!scope.userId || !db.userBusiness) return [];
  const satirlar = await db.userBusiness.findMany({
    where: { userId: scope.userId },
    select: { businessId: true },
  });
  return satirlar.map((s) => s.businessId);
}

/** Kapsamdaki işletme kimlikleri; boş liste yerine erişilemez kimlik döner. */
export async function allowedBusinessIdsFor(
  db: TenantDb,
  scope: TenantScope,
): Promise<string[]> {
  if (scope.role === "manager" || scope.role === "garson") {
    return scope.businessId ? [scope.businessId] : [IMPOSSIBLE_ID];
  }

  if (scope.role === "bolge") {
    // Atanan işletmeler yine hesap filtresinden geçiriliyor: atama yanlışlıkla
    // başka kiracının işletmesine yapılmış olsa bile kapsam dışında kalsın.
    const atanan = await bolgeIsletmeleri(db, scope);
    if (atanan.length === 0) return [IMPOSSIBLE_ID];
    const businesses = await db.business.findMany({
      where: { id: { in: atanan }, accountId: scope.accountId ?? IMPOSSIBLE_ID },
      select: { id: true },
    });
    return businesses.length > 0 ? businesses.map((b) => b.id) : [IMPOSSIBLE_ID];
  }

  const businesses = await db.business.findMany({
    where:
      scope.role === "superadmin"
        ? {}
        : { accountId: scope.accountId ?? IMPOSSIBLE_ID },
    select: { id: true },
  });

  return businesses.length > 0 ? businesses.map((b) => b.id) : [IMPOSSIBLE_ID];
}

/**
 * Erişim kontrolü sahipliğe dayanır, kimliğin tahmin edilemezliğine değil:
 * adres çubuğuna başka bir kiracının işletme kimliği yazılırsa burada durur.
 */
export async function canAccessBusinessFor(
  db: TenantDb,
  scope: TenantScope,
  businessId: string,
): Promise<boolean> {
  if (!businessId) return false;
  if (scope.role === "manager" || scope.role === "garson") {
    return scope.businessId === businessId;
  }

  if (scope.role === "bolge") {
    const atanan = await bolgeIsletmeleri(db, scope);
    if (!atanan.includes(businessId)) return false;
  }

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { accountId: true },
  });
  if (!business) return false;

  if (scope.role === "superadmin") return true;
  return business.accountId === scope.accountId;
}

/** Kullanıcı sorguları için hesap filtresi. */
export function userScopeFor(scope: TenantScope) {
  if (scope.role === "superadmin") return {};
  return { accountId: scope.accountId ?? IMPOSSIBLE_ID };
}
