import { SignJWT, jwtVerify } from "jose";

/**
 * Oturum jetonu üretimi/doğrulaması. Node'a özgü bağımlılık içermez ki
 * middleware (edge runtime) de kullanabilsin.
 */

export const SESSION_COOKIE = "mm_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 saat

/**
 * superadmin — platformu işleten taraf; tüm hesapları yönetir.
 * owner      — hesabın sahibi; yalnızca kendi hesabındaki işletmeler.
 * manager    — yalnızca kendi işletmesi.
 * garson     — saha personeli; yalnızca kendi vardiyasını ve günlük
 *              görevlerini görür, rapor/ayar ekranlarına hiç girmez.
 *
 * Rolün ne görebildiği ile hangi MODÜLLERE erişebildiği ayrı iki eksen:
 * rol "bu kişi ne yapabilir"i, moduller ise "hesap hangi modülleri
 * kullanıyor"u anlatır (bkz. lib/moduller.ts).
 */
export const ROLLER = [
  "superadmin",
  "owner",
  "bolge",
  "manager",
  "garson",
] as const;

export type Role = (typeof ROLLER)[number];

/**
 * Jetondan okunan rolün tanıdığımız bir rol olup olmadığı.
 *
 * Liste iki yerde ayrı ayrı yazıldığında yeni bir rol eklendiğinde biri
 * güncellenmeden kalıyor ve o roldeki kullanıcı giriş yapıp yapamadığını
 * bile anlayamıyor (jeton üretiliyor ama sonraki istekte sessizce
 * reddediliyor). Tek kaynak burası.
 */
export function gecerliRolMu(value: string): value is Role {
  return (ROLLER as readonly string[]).includes(value);
}

/**
 * Yazma yetkisi olmayan roller.
 *
 * "Salt okunur" (viewer) rolü kaldırıldı: pratikte hiç kullanılmıyordu
 * (üretimde tek kullanıcısı yoktu) ama her yetki kontrolüne ekstra bir dal
 * ekliyor, rol listesini uzatıyor ve "bu kişi neyi görebiliyor" sorusunu
 * zorlaştırıyordu. Liste artık boş — fonksiyon duruyor ki ileride bir
 * salt-okunur rol gerekirse tek yerden geri gelsin.
 */
export const SALT_OKUNUR_ROLLER: Role[] = [];

export function yazabilirMi(role: Role): boolean {
  return !SALT_OKUNUR_ROLLER.includes(role);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Kiracı kimliği. superadmin için null — hiçbir hesaba ait değildir. */
  accountId: string | null;
  /** manager için dolu; owner ve superadmin için null. */
  businessId: string | null;
  /**
   * Etkin modüller — yalnızca `getSession()` doldurur, her istekte DB'den
   * taze okuyarak (bkz. lib/moduller.ts). Jetona YAZILMAZ: 12 saat yaşayan
   * bir jetonda taşınsaydı, kapatılan bir modül yarım gün daha açık kalırdı.
   *
   * Jetondan üretilen nesnelerde bilerek boş: bir modül kontrolü yanlışlıkla
   * oraya düşerse erişim kapanır, açılmaz.
   */
  moduller: string[];
};

/** Jetonun hâlâ geçerli sayılıp sayılmayacağını belirleyen kullanıcı hâli. */
export type SessionCheck = {
  active: boolean;
  role: string;
  accountId: string | null;
  accountActive: boolean | null;
  passwordChangedAt: Date | null;
};

/**
 * İmzası geçerli bir jetonun yine de reddedilmesi gereken hâlleri.
 *
 * Jeton 12 saat yaşıyor; bu süre içinde yapılan yönetim işlemlerinin
 * etkisiz kalmaması için her istekte kullanıcının güncel hâline bakılır.
 * Karar burada saf bir fonksiyonda duruyor ki testlenebilsin.
 *
 * Geçerliyse null, değilse Türkçe bir sebep döner.
 */
export function sessionRevokedReason(
  user: SessionCheck | null,
  issuedAt: number,
): string | null {
  if (!user) return "kullanıcı yok";
  if (!user.active) return "kullanıcı pasif";
  if (user.role !== "superadmin") {
    if (!user.accountId) return "hesapsız kullanıcı";
    if (!user.accountActive) return "hesap askıda";
  }
  if (user.passwordChangedAt) {
    // iat saniye cinsinden; şifre değişiminden önceki jetonlar yanar.
    if (issuedAt < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return "şifre değişti";
    }
  }
  return null;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET tanımlı değil veya çok kısa. .env dosyasına en az 32 karakterlik bir değer yazın.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    accountId: user.accountId,
    businessId: user.businessId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Jetonun kendisinden okunan, henüz veritabanıyla karşılaştırılmamış oturum. */
export type TokenSession = SessionUser & {
  /** Jetonun üretildiği an (saniye). Şifre değişiminde eski jetonları elemek için. */
  issuedAt: number;
};

export async function verifySessionToken(
  token: string,
): Promise<TokenSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    if (!gecerliRolMu(payload.role)) return null;
    const role = payload.role;
    // superadmin dışındaki her kullanıcı bir hesaba bağlı olmak zorunda;
    // aksi halde kapsamsız bir oturum oluşur.
    const accountId = (payload.accountId as string | null) ?? null;
    if (role !== "superadmin" && !accountId) return null;

    return {
      id: String(payload.sub),
      name: String(payload.name ?? ""),
      email: payload.email,
      role,
      accountId,
      businessId: (payload.businessId as string | null) ?? null,
      // Jeton modül taşımaz; gerçek küme getSession'da DB'den okunuyor.
      moduller: [],
      issuedAt: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}
