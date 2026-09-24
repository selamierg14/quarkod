import { API_TABAN } from "./istemci";

/**
 * Sunucudan gelen görsel adresini yüklenebilir tam adrese çevirir.
 *
 * Sunucu (bkz. lib/gorsel-adres.ts) üç biçimden birini döndürüyor:
 * uygulamaya göreli bir yol (`/mekan-gorselleri/x.jpg`, `/g/<id>/kapak`),
 * mutlak bir http(s) adresi (görseller bir depolama servisine taşınırsa),
 * ya da null.
 *
 * Önceden çağıran taraf hepsinin başına `API_TABAN` ekliyordu; mutlak bir
 * adres geldiğinde bu `http://localhost:3000https://…` üretip görseli
 * sessizce kayboruyordu. Tek yerden geçirmek hem o hatayı kapatıyor hem de
 * her ekranda aynı kuralın uygulanmasını garanti ediyor.
 */
export function gorselAdresi(yol: string | null | undefined): string | null {
  if (!yol) return null;
  if (/^(https?:)?\/\//i.test(yol) || yol.startsWith("data:")) return yol;
  return `${API_TABAN}${yol.startsWith("/") ? "" : "/"}${yol}`;
}
