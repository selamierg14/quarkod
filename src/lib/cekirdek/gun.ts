/**
 * Vardiya/görev kayıtları saat değil gün bazlı tutulur — bu yüzden her
 * tarih 00:00'a sabitlenir. Aksi halde aynı günün iki farklı saatinde
 * girilen kayıt farklı günmüş gibi görünür.
 */
export function gunBaslangici(tarih: Date = new Date()): Date {
  const d = new Date(tarih);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function gunEkle(tarih: Date, gun: number): Date {
  const d = new Date(tarih);
  d.setDate(d.getDate() + gun);
  return d;
}

/** yyyy-aa-gg — form input[type=date] ve URL parametreleri için. */
export function gunGirdisi(tarih: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${tarih.getFullYear()}-${p(tarih.getMonth() + 1)}-${p(tarih.getDate())}`;
}

const GUN_ADLARI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function gunAdi(tarih: Date): string {
  return GUN_ADLARI[tarih.getDay()];
}

/** Verilen günün içinde bulunduğu haftanın pazartesisi. */
export function haftaBaslangici(tarih: Date): Date {
  const gun = gunBaslangici(tarih);
  const fark = (gun.getDay() + 6) % 7; // Pazartesi = 0
  return gunEkle(gun, -fark);
}

/**
 * `gunGirdisi`'nin tersi: "yyyy-aa-gg" metnini YEREL gün başlangıcına çevirir.
 *
 * `new Date("2026-08-28")` bu metni UTC gece yarısı sayıyor; UTC+3'te bu
 * yerel saatle 03:00, UTC-5'te ise bir önceki günün 19:00'u oluyor. Yani
 * gün adını doğrudan o Date'ten okumak, negatif ofsetli bir makinede
 * çizelgeyi bir gün kaydırıyor. Ayrıştırma bu yüzden elle yapılıyor.
 */
export function gunGirdisindenTarih(anahtar: string): Date {
  const [yil, ay, gun] = anahtar.split("-").map(Number);
  return new Date(yil, (ay ?? 1) - 1, gun ?? 1);
}
