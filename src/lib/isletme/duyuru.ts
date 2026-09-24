/** Bir duyurunun şu an müşteriye gösterilip gösterilmeyeceği. */
export function duyuruAktifMi(
  duyuru: { aktif: boolean; baslangic: Date | null; bitis: Date | null },
  simdi: Date = new Date(),
): boolean {
  if (!duyuru.aktif) return false;
  if (duyuru.baslangic && duyuru.baslangic > simdi) return false;
  if (duyuru.bitis && duyuru.bitis < simdi) return false;
  return true;
}
