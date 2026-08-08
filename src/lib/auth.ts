import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type Role,
  type SessionUser,
} from "./session-token";
import {
  allowedBusinessIdsFor,
  canAccessBusinessFor,
  userScopeFor,
} from "./tenancy";

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

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
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
  if (user.role === "manager") redirect("/admin");
  return user;
}

/** Yalnızca platformu işleten tarafın erişebileceği sayfalar için. */
export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "superadmin") redirect("/admin");
  return user;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { account: true },
  });
  if (!user || !user.active) return null;

  // Askıya alınan hesabın kullanıcıları giremez.
  if (user.role !== "superadmin" && !user.account?.active) return null;

  if (!(await bcrypt.compare(password, user.passwordHash))) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
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

/** Kullanıcının görebileceği işletmelerin kimlikleri. */
export async function allowedBusinessIds(user: SessionUser): Promise<string[]> {
  return allowedBusinessIdsFor(prisma, user);
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
  return canAccessBusinessFor(prisma, user, businessId);
}

/** Kullanıcının yönetebileceği kullanıcılar için Prisma filtresi. */
export function userScope(user: SessionUser) {
  return userScopeFor(user);
}
