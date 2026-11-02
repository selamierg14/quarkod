/**
 * Kullanıcı adı kuralları ve telefon normalleştirme.
 *
 * Giriş kimliği kullanıcı adıdır; bu yüzden biçimi dar tutuyoruz: küçük harf,
 * rakam, nokta, tire ve alt çizgi. Türkçe karakter kabul edilmez — telefonda
 * "ı" ile "i" ayrımı yüzünden giriş yapamayan kullanıcı en can sıkıcı destek
 * talebidir.
 *
 * Biçimin ikinci bir ilanı lib/cekirdek/desenler.ts'te (`kullaniciAdi`) —
 * orası arayüzün `pattern` niteliğini besliyor. İkisi AYNI kümeyi tarif
 * etmek zorunda; username.test.ts bunu doğruluyor.
 */

const MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

/** Serbest metinden geçerli bir kullanıcı adı türetir. */
export function toUsername(value: string): string {
  return value
    .split("")
    .map((char) => MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/\.{2,}/g, ".")
    // Tire de tekrarı sadeleşiyor — ".": ve "-" için kural aynı olmalı,
    // yoksa "a--b" gibi adlar türetimden çıkıyor.
    .replace(/-{2,}/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, USERNAME_MAX);
}

/** Kullanıcının girdiği adı doğrular; sorun varsa Türkçe mesaj döner. */
export function usernameProblem(value: string): string | null {
  const v = value.trim();
  if (v.length < USERNAME_MIN) {
    return `Kullanıcı adı en az ${USERNAME_MIN} karakter olmalı.`;
  }
  if (v.length > USERNAME_MAX) {
    return `Kullanıcı adı en fazla ${USERNAME_MAX} karakter olabilir.`;
  }
  if (!/^[a-z0-9._-]+$/.test(v)) {
    return "Kullanıcı adı yalnızca küçük harf, rakam, nokta, tire ve alt çizgi içerebilir.";
  }
  return null;
}

/**
 * Telefonu +905XXXXXXXXX biçimine çevirir; çevrilemezse null.
 * 2FA kodu buraya gideceği için biçim tek olmalı.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  let local: string | null = null;
  if (digits.length === 12 && digits.startsWith("90")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 10) local = digits;

  if (!local || !local.startsWith("5")) return null;
  return `+90${local}`;
}
