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

/**
 * İki ad "aynı şey" mi — kategori, görev gibi kullanıcının adlandırdığı
 * listelerde tekrarı yakalamak için.
 *
 * Büyük-küçük harf Türkçe kuralıyla katlanıyor ("İ"→"i", "I"→"ı") ve
 * boşluklar sadeleşiyor; aksanlar KORUNUYOR. foldTr burada fazla agresif
 * olurdu: "Kır" ile "Kir" farklı şeyler. Postgres'in `mode: insensitive`
 * (ILIKE) seçeneği de kullanılmıyor — sonucu sunucunun yerel ayarına bağlı
 * ve "İ"yi her zaman "i"ye indirmiyor.
 */
export function adAnahtari(ad: string): string {
  return ad.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

const TR_SIRALAYICI = new Intl.Collator("tr", { sensitivity: "base" });

/**
 * Ada göre Türkçe sıralama — yeni dizi döner.
 *
 * Veritabanının `ORDER BY name` sonucu sunucunun harmanlamasına bağlı:
 * "İbrahim" listenin sonuna, küçük harfle yazılmış adlar büyüklerin
 * arkasına düşüyordu (QA, personel seçim listeleri). Sayfalanmayan seçim
 * listeleri bellekte, Türkçe kurallarla sıralanıyor.
 */
export function trSirala<T>(liste: readonly T[], ad: (oge: T) => string): T[] {
  return [...liste].sort((a, b) => TR_SIRALAYICI.compare(ad(a), ad(b)));
}
