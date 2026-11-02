/**
 * Vardiya değişim/bırakma taleplerinin saf mantığı — eşleşme ve hedef hücre
 * durumu burada, sunucu bileşeninden ayrı, ki testlenebilsin.
 *
 * Bir talebin hedefTarih/hedefVardiya'sı BOŞSA "bırakma" (eski davranış):
 * onaylanırsa yalnızca boşalır. DOLUYSA "değişim": karşı tarafta tam tersini
 * isteyen başka bir talep varsa (A: X→Y isterken B: Y→X istiyorsa) ikisi
 * EŞLEŞMİŞ sayılır ve tek onayla ikisi birden takas edilir. Eşleşme yoksa
 * hedef hücrenin boş/dolu olmasına göre tek taraflı onay mümkün olabilir ya
 * da yalnızca bilgi olarak beklemede kalır.
 */

export type BekleyenDegisimTalebi = {
  id: string;
  requestedById: string;
  businessId: string;
  kaynakTarih: Date;
  kaynakVardiya: string;
  hedefTarih: Date | null;
  hedefVardiya: string | null;
};

export type DegisimDurumu =
  | { tur: "hedefsiz" }
  | { tur: "eslesti"; digerTalepId: string }
  | { tur: "hedefBos" }
  | { tur: "hedefDolu" };

function gunEsit(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/**
 * Karşılıklı tam eşleşme: biri kaynaktan hedefe, diğeri o hedeften bu
 * kaynağa geçmek istiyor. Aynı kişinin iki talebi birbiriyle eşleşmez
 * (requestedById farklı olmalı) — aksi hâlde biri kendiyle takas etmiş gibi
 * görünürdü.
 */
export function eslesenTalebiBul(
  talep: BekleyenDegisimTalebi,
  digerleri: BekleyenDegisimTalebi[],
): BekleyenDegisimTalebi | null {
  if (!talep.hedefTarih || !talep.hedefVardiya) return null;
  const hedefTarih = talep.hedefTarih;
  const hedefVardiya = talep.hedefVardiya;

  return (
    digerleri.find(
      (d) =>
        d.id !== talep.id &&
        d.businessId === talep.businessId &&
        d.requestedById !== talep.requestedById &&
        d.hedefTarih !== null &&
        d.hedefVardiya !== null &&
        gunEsit(d.kaynakTarih, hedefTarih) &&
        d.kaynakVardiya === hedefVardiya &&
        gunEsit(d.hedefTarih, talep.kaynakTarih) &&
        d.hedefVardiya === talep.kaynakVardiya,
    ) ?? null
  );
}

/**
 * Hedef gün/vardiyada TALEP EDENDEN BAŞKA birinin ataması var mı.
 * `haricTutulacakAssignmentId` kendi atamasını (hedef==kaynak gibi saçma bir
 * durumda) yanlışlıkla "dolu" saymasın diye.
 */
export function hedefDoluMu(
  talep: BekleyenDegisimTalebi,
  atamalar: { businessId: string; userId: string; date: Date; shift: string }[],
): boolean {
  if (!talep.hedefTarih || !talep.hedefVardiya) return false;
  const hedefTarih = talep.hedefTarih;
  return atamalar.some(
    (a) =>
      a.businessId === talep.businessId &&
      a.userId !== talep.requestedById &&
      gunEsit(a.date, hedefTarih) &&
      a.shift === talep.hedefVardiya,
  );
}

/**
 * Bir talebin dört halden hangisinde olduğu. `digerleri` aynı işletmenin
 * TÜM bekleyen talepleri olmalı (kendisi dahil, fonksiyon kendisini eler).
 */
export function talepDurumunuBelirle(
  talep: BekleyenDegisimTalebi,
  digerleri: BekleyenDegisimTalebi[],
  atamalar: { businessId: string; userId: string; date: Date; shift: string }[],
): DegisimDurumu {
  if (!talep.hedefTarih || !talep.hedefVardiya) return { tur: "hedefsiz" };

  const eslesen = eslesenTalebiBul(talep, digerleri);
  if (eslesen) return { tur: "eslesti", digerTalepId: eslesen.id };

  return hedefDoluMu(talep, atamalar) ? { tur: "hedefDolu" } : { tur: "hedefBos" };
}
