/**
 * Masa numaralarının doğal sıralaması.
 *
 * `tableNumber` bir metin alanı: "VIP-1", "Teras", "1-20" gibi değerler de
 * girilebiliyor. Veritabanının metin sıralaması bu yüzden kaçınılmaz olarak
 * 1, 10, 11, 12, 2, 3… üretiyordu — masaları basılı kartla eşleştirmeye
 * çalışan kişi için kullanılamaz bir sıra. Sayı içeren parçaları sayı gibi
 * karşılaştırıyoruz: "Masa 2" < "Masa 10", "VIP-2" < "VIP-10".
 */
const KARSILASTIRICI = new Intl.Collator("tr", {
  numeric: true,
  sensitivity: "base",
});

export function masaSirala<T extends { tableNumber: string; isEntrance?: boolean }>(
  masalar: T[],
): T[] {
  return [...masalar].sort((a, b) => {
    // Giriş/kapı QR'ı her zaman en üstte: masa listesinin bir parçası değil,
    // işletmenin ortak noktası.
    if (a.isEntrance !== b.isEntrance) return a.isEntrance ? -1 : 1;
    return KARSILASTIRICI.compare(a.tableNumber, b.tableNumber);
  });
}

/** Etiket metni: giriş QR'ının numarası gösterilmez. */
export function masaEtiketi(masa: { tableNumber: string; isEntrance: boolean }): string {
  return masa.isEntrance ? "Giriş" : `Masa ${masa.tableNumber}`;
}
