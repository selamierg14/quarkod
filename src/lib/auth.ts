import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  sessionRevokedReason,
  verifySessionToken,
  yazabilirMi,
  type Role,
  type SessionUser,
} from "./session-token";
import {
  allowedBusinessIdsFor,
  canAccessBusinessFor,
  userScopeFor,
} from "./tenancy";
import { effectiveAccountId } from "./impersonation";
import { hesapAktifMi } from "./abonelik";

export { SESSION_COOKIE, type Role, type SessionUser };

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Geçerli oturum — jeton imzası VE kullanıcının güncel hâli doğrulanır.
 *
 * Jeton 12 saat geçerli; imzaya bakmakla yetinseydik bu süre boyunca
 * yapılan yönetim işlemleri hiçbir işe yaramazdı:
 *
 * - Pasifleştirilen kullanıcı panelde çalışmaya devam ederdi,
 * - askıya alınan hesabın kullanıcıları içeride kalırdı (README bunun
 *   aksini söylüyordu),
 * - rolü sorumluluğa düşürülen kişi patron yetkisini korurdu,
 * - şifresi çalınan kullanıcı şifresini değiştirse bile saldırganın açık
 *   oturumu kapanmazdı.
 *
 * Bu yüzden her istekte kullanıcı tazeleniyor ve rol/kapsam jetondan değil
 * veritabanından okunuyor. Panel trafiği düşük; sayfa başına bir sorgunun
 * bedeli, yukarıdaki dördünün yanında önemsiz.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const jeton = await verifySessionToken(token);
  if (!jeton) return null;

  const user = await prisma.user.findUnique({
    where: { id: jeton.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountId: true,
      businessId: true,
      active: true,
      passwordChangedAt: true,
      account: { select: { active: true, expiresAt: true } },
    },
  });

  const iptal = sessionRevokedReason(
    user && {
      active: user.active,
      role: user.role,
      accountId: user.accountId,
      accountActive: user.account ? hesapAktifMi(user.account) : null,
      passwordChangedAt: user.passwordChangedAt,
    },
    jeton.issuedAt,
  );
  if (iptal || !user) return null;

  const role = user.role as Role;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    accountId: user.accountId,
    businessId: user.businessId,
  };
}

/** Admin sayfaları için: oturum yoksa giriş ekranına atar. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/admin/giris");
  return user;
}

/** Hesap sahibi veya platform yöneticisi gerektiren sayfalar için. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner" && user.role !== "superadmin") redirect("/admin");
  return user;
}

/**
 * Yazma işlemi yapan her sunucu eyleminin ilk satırı.
 *
 * Salt okunur kullanıcının arayüzünde düğmeler gizli ama form doğrudan da
 * gönderilebilir; yetki kontrolü görünürlüğe değil bu kapıya dayanmalı.
 */
export async function requireYazma(): Promise<SessionUser> {
  const user = await requireUser();
  if (!yazabilirMi(user.role)) {
    throw new Error("Bu hesap salt okunur; değişiklik yapamaz.");
  }
  return user;
}

/**
 * Kullanıcının "işlem yaptığı" hesap.
 *
 * Superadmin bir hesaba geçtiyse yeni kayıtlar (işletme, kullanıcı) o hesaba
 * açılır; geçmediyse null döner ve çağıran taraf hata verir.
 */
export async function actingAccountId(user: SessionUser): Promise<string | null> {
  return effectiveAccountId(user);
}

/** Yalnızca platformu işleten tarafın erişebileceği sayfalar için. */
export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "superadmin") redirect("/admin");
  return user;
}

/**
 * Bir kiracının verisini gösteren sayfaların kapısı.
 *
 * Platform yöneticisi hiçbir işletmenin sahibi değil; hesap seçmeden bu
 * ekranlara girerse tüm kiracıların verisi tek potada karışır ve "kimin
 * ortalaması bu?" sorusunun cevabı olmaz. Önce Hesaplar'dan bir hesaba
 * girmesi gerekiyor.
 */
export async function requireTenant(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "superadmin" && !(await effectiveAccountId(user))) {
    redirect("/admin/hesaplar");
  }
  return user;
}

/** Hem hesap sahibi yetkisi hem de seçili bir kiracı isteyen ekranlar. */
export async function requireTenantOwner(): Promise<SessionUser> {
  const user = await requireOwner();
  if (user.role === "superadmin" && !(await effectiveAccountId(user))) {
    redirect("/admin/hesaplar");
  }
  return user;
}

/** Oturuma dönüştürülecek kullanıcı kaydı. */
export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  accountId: string | null;
  businessId: string | null;
  phone: string | null;
};

/**
 * Kullanıcı adı + şifre doğrulaması.
 *
 * Giriş kimliği e-posta değil kullanıcı adıdır: personel değişiminde e-posta
 * değişse bile giriş bilgisi sabit kalsın diye.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    include: { account: true },
  });
  if (!user || !user.active) return null;

  // Askıya alınan ya da süresi dolan hesabın kullanıcıları giremez.
  if (user.role !== "superadmin" && !hesapAktifMi(user.account)) return null;

  if (!(await bcrypt.compare(password, user.passwordHash))) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    accountId: user.accountId,
    businessId: user.businessId,
    phone: user.phone,
  };
}

/** Doğrulanmış kullanıcıdan oturum nesnesi (2FA sonrası). */
export function toSessionUser(user: AuthenticatedUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountId: user.accountId,
    businessId: user.businessId,
  };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Aşağıdakiler tenancy.ts'teki kuralları oturumla sarmalar. Kuralların kendisi
 * orada, testlerle birlikte duruyor.
 */

/**
 * Kullanıcının görebileceği işletmelerin kimlikleri.
 *
 * Superadmin bir hesabı görüntülemeyi seçtiyse kapsam o hesaba daralır;
 * seçmediyse tüm hesapları kapsar.
 */
export async function allowedBusinessIds(user: SessionUser): Promise<string[]> {
  const aktif = await effectiveAccountId(user);
  if (user.role === "superadmin" && aktif) {
    return allowedBusinessIdsFor(prisma, {
      role: "owner",
      accountId: aktif,
      businessId: null,
    });
  }
  return allowedBusinessIdsFor(prisma, { ...user, userId: user.id });
}

/** Kullanıcının panelde seçebileceği işletmeler. */
export async function visibleBusinesses(user: SessionUser) {
  const ids = await allowedBusinessIds(user);
  return prisma.business.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
  });
}

/** Bir işletmeye erişim izni var mı — hesap sınırını da doğrular. */
export async function canAccessBusiness(
  user: SessionUser,
  businessId: string,
): Promise<boolean> {
  const aktif = await effectiveAccountId(user);
  if (user.role === "superadmin" && aktif) {
    return canAccessBusinessFor(
      prisma,
      { role: "owner", accountId: aktif, businessId: null },
      businessId,
    );
  }
  return canAccessBusinessFor(prisma, { ...user, userId: user.id }, businessId);
}

/** Kullanıcının yönetebileceği kullanıcılar için Prisma filtresi. */
export async function userScope(user: SessionUser) {
  const aktif = await effectiveAccountId(user);
  if (user.role === "superadmin" && aktif) return { accountId: aktif };
  return userScopeFor(user);
}
