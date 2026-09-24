/**
 * LİSTE SAYFALAMA — tek kaynak.
 *
 * Panelde her liste kendi sınırını kendi koyuyordu ve üçü birbirini
 * tutmuyordu: denetim kaydı 50'şer, geri bildirimler 20'şer, izinler
 * 500, kullanıcılar ise HİÇ sınırsız (elli işletmelik bir hesapta tek
 * sayfada yüzlerce satır). Sayfa boyutunu kullanıcı seçemiyordu.
 *
 * Kurallar burada, saf ve testli: sayfa numarası ve boyut istekten
 * geliyor, yani ikisi de GÜVENİLMEZ. `?boyut=100000` yazan biri tek
 * istekte bütün tabloyu çekebilirdi; izinli boyutlar sabit bir liste.
 */

/** Kullanıcının seçebildiği sayfa boyutları — arayüzdeki açılır liste. */
export const SAYFA_BOYUTLARI = [10, 25, 50, 100] as const;

export type SayfaBoyutu = (typeof SAYFA_BOYUTLARI)[number];

/**
 * Varsayılan 10.
 *
 * Küçük bir ilk sayfa, listeyi telefonda da okunur tutuyor ve ilk
 * boyamada daha az satır demek. Daha fazlasını isteyen açılır listeden
 * seçiyor ve seçimi adreste taşındığı için paylaşılabilir/geri
 * gidilebilir oluyor.
 */
export const VARSAYILAN_BOYUT: SayfaBoyutu = 10;

export type SayfaDurumu = {
  sayfa: number;
  boyut: SayfaBoyutu;
  /** Prisma'ya doğrudan verilebilir. */
  skip: number;
  take: number;
};

export function gecerliBoyutMu(deger: number): deger is SayfaBoyutu {
  return (SAYFA_BOYUTLARI as readonly number[]).includes(deger);
}

/** Ham `?boyut=` değerini izinli boyuta indirger. */
export function boyutCoz(ham: string | number | undefined | null): SayfaBoyutu {
  const sayi = typeof ham === "number" ? ham : Number(String(ham ?? "").trim());
  return gecerliBoyutMu(sayi) ? sayi : VARSAYILAN_BOYUT;
}

/** Ham `?sayfa=` değerini 1'den küçük olmayan tam sayıya indirger. */
export function sayfaCoz(ham: string | number | undefined | null): number {
  const sayi = typeof ham === "number" ? ham : Number(String(ham ?? "").trim());
  if (!Number.isFinite(sayi)) return 1;
  return Math.max(1, Math.floor(sayi));
}

/**
 * İstekten sayfa durumunu çıkarır.
 *
 * `toplam` verilirse sayfa numarası son sayfaya KIRPILIYOR: 3 kayıtlık
 * bir listede `?sayfa=99` boş bir ekran gösterirdi ve kullanıcı listenin
 * boşaldığını sanırdı. Süzgeç değiştiğinde (adreste sayfa kalırken sonuç
 * sayısı düştüğünde) tam olarak bu oluyordu.
 */
export function sayfaDurumu(
  sorgu: { sayfa?: string | number; boyut?: string | number },
  toplam?: number,
): SayfaDurumu {
  const boyut = boyutCoz(sorgu.boyut);
  const istenen = sayfaCoz(sorgu.sayfa);
  const sonSayfa = toplam === undefined ? istenen : toplamSayfa(toplam, boyut);
  const sayfa = Math.min(istenen, sonSayfa);

  return { sayfa, boyut, skip: (sayfa - 1) * boyut, take: boyut };
}

/** En az 1: boş liste de "1 / 1" gösteriyor, "1 / 0" değil. */
export function toplamSayfa(toplam: number, boyut: SayfaBoyutu): number {
  if (!Number.isFinite(toplam) || toplam <= 0) return 1;
  return Math.max(1, Math.ceil(toplam / boyut));
}

/** "11–20 / 137" — kullanıcıya nerede olduğunu söyleyen metin. */
export function aralikMetni(durum: SayfaDurumu, toplam: number): string {
  if (toplam <= 0) return "0 kayıt";
  const ilk = durum.skip + 1;
  const son = Math.min(durum.skip + durum.take, toplam);
  return `${ilk}–${son} / ${toplam}`;
}

/**
 * Sayfalama çubuğu çizilsin mi?
 *
 * En küçük boyutun altındaki listede çubuk gürültü: üç satırlık bir
 * tabloya "1–3 / 3" ve boyut seçici koymak, okunacak bir şey eklemeden
 * ekranı kalabalıklaştırır. Kullanıcı boyutu büyütmüşse çubuk kalıyor ki
 * seçimini geri alabilsin.
 */
export function cubukGosterilsinMi(toplam: number, boyut: SayfaBoyutu): boolean {
  return toplam > SAYFA_BOYUTLARI[0] || boyut !== VARSAYILAN_BOYUT;
}
