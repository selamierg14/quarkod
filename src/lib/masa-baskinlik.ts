export type MasaBaskinlikUyarisi = { etiket: string; oran: number } | null;

/**
 * "Tek QR'ı bütün masalara dağıttım" tuzağı.
 *
 * Sistemde "Tek ortak QR" diye bir seçenek var (bkz. TekQrKurulum) — amacı
 * masa kavramı olmayan yerler (büfe, kuaför) için tek bir kod üretmek.
 * Ama bir işletme sahibi numaralı masaları da açıkken bu tek kodu basıp
 * her masaya yapıştırabilir: hepsi çalışır, müşteri anketi doldurur, ama
 * her geri bildirim aynı "nokta"ya yazılır. O andan sonra "Masaya göre"
 * raporu artık gerçek bir kırılım değil, tek bir satırda toplanan gürültü
 * olur — ve kimse bunu panelde görene kadar fark etmez.
 *
 * Burada gerçek bir QR ayarına bakmıyoruz (o hâlâ doğru görünebilir);
 * DAVRANIŞA bakıyoruz: tek bir nokta, geri bildirimlerin büyük kısmını tek
 * başına taşıyorken başka aktif noktalar da varsa, bu neredeyse kesin bir
 * kopyalama işaretidir.
 */
export function masaBaskinliginiTespitEt(
  satirlar: { label: string; count: number }[],
  aktifMasaSayisi: number,
  esikOran = 0.6,
  asgariKayit = 10,
): MasaBaskinlikUyarisi {
  // Az sayıda aktif masa zaten "QR noktasına göre" tek nokta senaryosu —
  // Kırılım sayfası bunu ayrı ele alıyor, burada tekrar alarm vermiyoruz.
  if (aktifMasaSayisi < 3) return null;
  if (satirlar.length === 0) return null;

  const toplam = satirlar.reduce((t, s) => t + s.count, 0);
  if (toplam < asgariKayit) return null;

  const enBuyuk = satirlar.reduce((a, b) => (b.count > a.count ? b : a));
  const oran = enBuyuk.count / toplam;
  if (oran < esikOran) return null;

  return { etiket: enBuyuk.label, oran };
}
