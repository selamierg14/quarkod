import "server-only";
import { cache } from "react";
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
 *
 * `cache()` ile sarılı: tek bir istek içinde layout + sayfa + eylemler
 * ayrı ayrı requireUser/requireTenant/requireOwner çağırıyor (ör. layout
 * bir kez, her sayfa kendi require*'ı için bir kez daha) — sarmalama
 * olmadan bu, TEK sayfa yüklemesinde aynı kullanıcı satırını iki kez
 * sorgulamak demekti. React bu fonksiyonu istek başına bir kez çalıştırıp
 * sonucu tüm çağıranlara aynı referansla döndürür; bir sonraki istekte
 * (yeni render) önbellek sıfırlanır, yani "şifre değişti" gibi kontroller
 * hâlâ her istekte tazeden çalışır.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
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
      menuIzni: true,
      anketIzni: true,
      account: { select: { active: true, expiresAt: true } },
    },
  });

  const iptal = sessionRevokedReason(
    user && {
      active: user.active,
      role: user.role,
      accountId: user.accountId,
      // Yalnızca elle askıya alma (active:false) oturumu iptal eder. Süre
      // dolması artık girişi engellemiyor: hesap sahibi salt okunur girip
      // verisini görebilsin, dışa aktarabilsin ve yenileyebilsin. Yazma
      // engeli requireYazma'da; QR müşteri sayfaları ise hesapAktifMi ile
      // süre dolunca zaten kapanıyor.
      accountActive: user.account ? user.account.active : null,
      passwordChangedAt: user.passwordChangedAt,
    },
    jeton.issuedAt,
  );
  if (iptal || !user) return null;

  const role = user.role as Role;
  // Sahip ve platform yöneticisi modül kısıtının dışında: kısıt yalnızca
  // ekip üyelerini (manager/bölge/viewer) sınırlamak için var.
  const sinirsiz = role === "owner" || role === "superadmin";

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    accountId: user.accountId,
    businessId: user.businessId,
    menuIzni: sinirsiz || user.menuIzni,
    anketIzni: sinirsiz || user.anketIzni,
  };
});

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
  // Süresi dolmuş hesap salt okunur: sahibi girip verisini görebilir ve dışa
  // aktarabilir ama menü/anket/kullanıcı üzerinde değişiklik yapamaz. Platform
  // yöneticisi bu kısıttan muaf (ödemeyi görüp süreyi o uzatıyor).
  if (user.role !== "superadmin" && user.accountId) {
    const hesap = await prisma.account.findUnique({
      where: { id: user.accountId },
      select: { active: true, expiresAt: true },
    });
    // active:false olan zaten giremez; buradaki tek durum "aktif ama süresi
    // dolmuş" hesap.
    if (hesap?.active && !hesapAktifMi(hesap)) {
      throw new Error(
        "Aboneliğinizin süresi doldu; yenilenene kadar değişiklik yapılamaz.",
      );
    }
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
  // Saha personeli (garson) rapor/ayar ekranlarına hiç girmez — kendi
  // vardiya/görev ekranına düşer. Bu kapı olmasaydı requireTenant'a bağlı
  // her sayfa (Özet, Geri bildirimler, QR Menü...) garsona da açık kalırdı.
  if (user.role === "garson") redirect("/admin/vardiyalarim");
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

/** QR Menü modülüne erişim izni olmayan personel bu sayfalara giremez. */
export async function requireMenuErisim(): Promise<SessionUser> {
  const user = await requireTenant();
  if (!user.menuIzni) redirect("/admin");
  return user;
}

/** Geri bildirim/anket sonuçlarına erişim izni olmayan personel bu sayfalara giremez. */
export async function requireAnketErisim(): Promise<SessionUser> {
  const user = await requireTenant();
  if (!user.anketIzni) redirect("/admin");
  return user;
}

/**
 * Vardiya çizelgesi ve görev şablonu — planlayan taraf. Salt okunur
 * kullanıcı buradan da yazamaz; garson zaten requireTenant'ta ayrılıyor.
 */
export async function requirePersonelYonetimi(): Promise<SessionUser> {
  const user = await requireTenant();
  if (user.role === "viewer") redirect("/admin");
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

  // Yalnızca elle askıya alınan hesabın (active:false) kullanıcıları giremez.
  // Süresi dolmuş hesabın sahibi salt okunur girebilir: verisini görür, dışa
  // aktarır, yeniler. Yazma engeli requireYazma'da, QR kapanışı hesapAktifMi'de.
  if (user.role !== "superadmin" && user.account && !user.account.active) {
    return null;
  }

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
export const allowedBusinessIds = cache(async (user: SessionUser): Promise<string[]> => {
  const aktif = await effectiveAccountId(user);
  if (user.role === "superadmin" && aktif) {
    return allowedBusinessIdsFor(prisma, {
      role: "owner",
      accountId: aktif,
      businessId: null,
    });
  }
  return allowedBusinessIdsFor(prisma, { ...user, userId: user.id });
});

/**
 * Kullanıcının panelde seçebileceği işletmeler.
 *
 * `cache()` ile sarılı: layout kendi menüsü için bir kez, açılan sayfa
 * (menü, duyurular, vardiya çizelgesi, işletme ayarları…) kendi
 * `IsletmeSecici`'si için bir kez daha çağırıyordu — tek sayfa
 * yüklemesinde aynı sorgu iki kez atılıyordu. `user` referansı
 * `getSession()`'ın önbelleklediği aynı nesne olduğu için burası da aynı
 * istek içinde tek sorguya iniyor.
 */
export const visibleBusinesses = cache(async (user: SessionUser) => {
  const ids = await allowedBusinessIds(user);
  return prisma.business.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
  });
});

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
