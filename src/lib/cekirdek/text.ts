/**
 * Türkçe metni aramaya hazır hale getirir: küçük harf + aksanları sadeleştirme.
 *
 * SQLite'ın yerleşik LIKE'ı yalnızca ASCII harflerde büyük-küçük eşleştirir;
 * "Şikayet" ile "şikayet" onun için farklı kelimelerdir. Bu yüzden yorumun
 * katlanmış bir kopyasını saklayıp aramayı onun üzerinde yapıyoruz.
 *
 * Aksanları da düşürüyoruz — müşteri ve personel çoğu zaman Türkçe karakter
 * kullanmadan yazıyor; "sikayet" araması "şikâyet"i de bulmalı.
 */
const FOLD_MAP: Record<string, string> = {
  ç: "c", Ç: "c",
  ğ: "g", Ğ: "g",
  ı: "i", I: "i", İ: "i", i: "i",
  ö: "o", Ö: "o",
  ş: "s", Ş: "s",
  ü: "u", Ü: "u",
  â: "a", Â: "a",
  î: "i", Î: "i",
  û: "u", Û: "u",
};

export function foldTr(value: string): string {
  return value
    .split("")
    .map((char) => FOLD_MAP[char] ?? char)
    .join("")
    .toLowerCase();
}
