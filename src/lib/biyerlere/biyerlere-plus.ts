/**
 * Biyerlere Plus üyeliğinin GEÇERLİ olup olmadığı.
 *
 * `plusUyeMi` tek başına yeterli değil: `plusBitis` doluysa ve geçmişse
 * üyelik bitmiş sayılır, `plusUyeMi` alanı superadmin unutkanlığıyla
 * `true` kalmış olsa bile — Account.expiresAt'in `active` alanından
 * bağımsız çalışmasıyla AYNI ilke (bkz. schema.prisma'daki iki yorum).
 */
export function plusGecerliMi(
  kullanici: { plusUyeMi: boolean; plusBitis: Date | null },
  simdi: Date = new Date(),
): boolean {
  if (!kullanici.plusUyeMi) return false;
  if (kullanici.plusBitis && kullanici.plusBitis < simdi) return false;
  return true;
}

/** Bir Plus hediyesinin kupon kodundaki sabit önek — cüzdanda/denetimde ayırt edilsin diye. */
export const PLUS_KUPON_ONEKI = "PLUS-";

export const PLUS_HEDIYE_ACIKLAMASI = "Ücretsiz kahve (Biyerlere Plus)";
