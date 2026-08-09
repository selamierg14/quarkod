import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { SessionUser } from "./session-token";

/**
 * Platform yöneticisinin bir kiracıyı "içeriden" görmesi.
 *
 * Superadmin normalde tüm hesapları kapsar; bu da işletme listesini ve
 * ortalamaları birbirine karıştırır. Bir hesap seçildiğinde kapsam o hesaba
 * daraltılır ve panel tam olarak o kiracının gördüğü hale gelir.
 *
 * Seçim çerezde durur — oturum jetonuna gömülseydi hesap değiştirmek için
 * yeniden giriş gerekirdi.
 */

const ACTIVE_ACCOUNT_COOKIE = "mm_aktif_hesap";

export async function setActiveAccount(accountId: string) {
  const store = await cookies();
  store.set(ACTIVE_ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearActiveAccount() {
  const store = await cookies();
  store.delete(ACTIVE_ACCOUNT_COOKIE);
}

/**
 * Superadmin'in şu an hangi hesabı görüntülediğini döner.
 * Yalnızca superadmin için anlamlıdır; diğer roller kendi hesabına bağlıdır.
 */
export async function getActiveAccountId(user: SessionUser): Promise<string | null> {
  if (user.role !== "superadmin") return null;
  const store = await cookies();
  return store.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? null;
}

export type ActiveAccount = { id: string; name: string; active: boolean };

/** Görüntülenen hesabın bilgisi (üstteki bandı çizmek için). */
export async function getActiveAccount(
  user: SessionUser,
): Promise<ActiveAccount | null> {
  const id = await getActiveAccountId(user);
  if (!id) return null;

  const account = await prisma.account.findUnique({
    where: { id },
    select: { id: true, name: true, active: true },
  });
  return account;
}

/**
 * Kapsam hesaplanırken kullanılacak etkin hesap kimliği.
 * Superadmin bir hesap seçtiyse o, seçmediyse null (tümü).
 */
export async function effectiveAccountId(
  user: SessionUser,
): Promise<string | null> {
  if (user.role === "superadmin") return getActiveAccountId(user);
  return user.accountId;
}
