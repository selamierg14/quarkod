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

/** Sadece patronun erişebileceği sayfalar için. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/admin");
  return user;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !user.active) return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    businessId: user.businessId,
  };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Kullanıcının görebileceği kayıtlar için Prisma filtresi.
 * Patron: hepsi. İşletme sorumlusu: sadece kendi işletmesi.
 */
export function businessScope(user: SessionUser) {
  if (user.role === "owner") return {};
  return { businessId: user.businessId ?? "__yok__" };
}

/** Sorumlunun başka bir işletmenin kaydına erişmesini engeller. */
export function canAccessBusiness(user: SessionUser, businessId: string) {
  return user.role === "owner" || user.businessId === businessId;
}

/** Kullanıcının panelde seçebileceği işletmeler. */
export async function visibleBusinesses(user: SessionUser) {
  return prisma.business.findMany({
    where: user.role === "owner" ? {} : { id: user.businessId ?? "__yok__" },
    orderBy: { createdAt: "asc" },
  });
}
