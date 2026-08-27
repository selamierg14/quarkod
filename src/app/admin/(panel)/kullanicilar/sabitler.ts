/**
 * Seed betiklerinin verdiği varsayılan şifre — panelde "hâlâ kullanılıyor mu"
 * uyarısı göstermek için.
 *
 * Ayrı dosyada duruyor çünkü actions.ts "use server" dosyası: böyle bir
 * dosya yalnızca async fonksiyon export edebilir, düz bir sabit
 * ekleyince Next derlemeyi "modülün hiç export'u yok" diyerek reddediyor.
 */
export const SEED_SIFRESI = "degistir123";
