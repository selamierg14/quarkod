import QRCode from "qrcode";
import {
  A4,
  SayfaCizimi,
  hexToRgb,
  kisalt,
  metinGenisligi,
  pdfOlustur,
  type Renk,
} from "./pdf";

/**
 * Matbaaya gönderilecek toplu QR kartı PDF'i.
 *
 * Patron QR'ları tek tek PNG indirip Word'de dizmek zorunda kalıyordu; bu
 * modül aynı işi A4 ızgarada, kesim kılavuzlarıyla ve vektörel QR'la tek
 * dosyada veriyor.
 */

/** Sayfa kenar boşluğu (pt). ~10 mm; çoğu matbaa yazıcısının basamadığı şerit. */
const KENAR = 28;
const SUTUN = 3;
const SATIR = 3;
/** Bir A4'e sığan kart sayısı. */
export const SAYFA_BASINA = SUTUN * SATIR;

const KART_IC = 12;

export type QrKart = {
  /** "Masa 4" ya da "Giriş". */
  etiket: string;
  /** QR'ın gösterdiği adres. */
  url: string;
};

export type QrPdfSecenekleri = {
  isletmeAdi: string;
  /** Karekodun üstündeki çağrı cümlesi. */
  cagriMetni: string;
  /** Marka rengi (hex) — başlık ve QR bu renkte basılır. */
  markaRengi: string;
  kartlar: QrKart[];
};

/**
 * Metni verilen genişliğe göre satırlara böler.
 *
 * Tek kelime bile sığmıyorsa kısaltılarak konur: kutudan taşan bir satır,
 * yan kartın üstüne biner ve baskıyı çöpe çıkarır.
 */
export function satirlaraBol(
  text: string,
  maxGenislik: number,
  punto: number,
  maxSatir: number,
): string[] {
  const kelimeler = text.trim().split(/\s+/).filter(Boolean);
  if (kelimeler.length === 0) return [];

  const satirlar: string[] = [];
  let mevcut = "";

  for (const kelime of kelimeler) {
    const aday = mevcut ? `${mevcut} ${kelime}` : kelime;
    if (metinGenisligi(aday, punto, false) <= maxGenislik) {
      mevcut = aday;
      continue;
    }
    if (mevcut) satirlar.push(mevcut);
    if (satirlar.length === maxSatir) return satirlar;
    mevcut = kelime;
  }
  if (mevcut && satirlar.length < maxSatir) satirlar.push(mevcut);

  // Son satır hâlâ taşıyorsa (tek uzun kelime) kısaltıyoruz.
  return satirlar.map((s) => kisalt(s, maxGenislik, punto, false));
}

/** Kartların sayfa içindeki sol-alt köşe konumları. */
export function kartKutulari(): { x: number; y: number; g: number; y_: number }[] {
  const g = (A4.genislik - KENAR * 2) / SUTUN;
  const h = (A4.yukseklik - KENAR * 2) / SATIR;
  const kutular: { x: number; y: number; g: number; y_: number }[] = [];
  for (let satir = 0; satir < SATIR; satir++) {
    for (let sutun = 0; sutun < SUTUN; sutun++) {
      kutular.push({
        x: KENAR + sutun * g,
        // PDF'te y aşağıdan sayılır; ilk satır en üstte olsun istiyoruz.
        y: A4.yukseklik - KENAR - (satir + 1) * h,
        g,
        y_: h,
      });
    }
  }
  return kutular;
}

export type QrMatris = { size: number; data: Uint8Array | number[] };
/** Bir satırdaki bitişik koyu modül dizisi. */
export type ModulDizisi = { satir: number; sutun: number; uzunluk: number };

/**
 * Koyu modülleri satır satır bitişik dizilere indirger.
 *
 * Her modülü ayrı dikdörtgen çizmek dosyayı üç katına çıkarıyordu; çıktı
 * birebir aynı kaldığı için birleştiriyoruz.
 */
export function modulDizileri(matris: QrMatris): ModulDizisi[] {
  const diziler: ModulDizisi[] = [];
  for (let satir = 0; satir < matris.size; satir++) {
    let baslangic = -1;
    for (let sutun = 0; sutun <= matris.size; sutun++) {
      const koyu =
        sutun < matris.size && Boolean(matris.data[satir * matris.size + sutun]);
      if (koyu && baslangic === -1) baslangic = sutun;
      if (!koyu && baslangic !== -1) {
        diziler.push({ satir, sutun: baslangic, uzunluk: sutun - baslangic });
        baslangic = -1;
      }
    }
  }
  return diziler;
}

/** QR modül matrisini kart içine vektörel dikdörtgenler olarak çizer. */
function qrCiz(
  sayfa: SayfaCizimi,
  matris: QrMatris,
  solX: number,
  altY: number,
  boyut: number,
  renk: Renk,
): void {
  const modul = boyut / matris.size;
  for (const dizi of modulDizileri(matris)) {
    sayfa.dikdortgen(
      solX + dizi.sutun * modul,
      // Matrisin ilk satırı görselin en üstü; PDF'te y aşağıdan sayıldığı
      // için bu en büyük y'ye denk gelir. Ters çevrilirse kod okunmaz.
      altY + boyut - (dizi.satir + 1) * modul,
      dizi.uzunluk * modul,
      modul,
      renk,
    );
  }
}

/** Tek bir kartı çizer. */
function kartCiz(
  sayfa: SayfaCizimi,
  kutu: { x: number; y: number; g: number; y_: number },
  kart: QrKart,
  matris: QrMatris,
  secenekler: QrPdfSecenekleri,
): void {
  const marka = hexToRgb(secenekler.markaRengi);
  const koyu: Renk = { r: 0.13, g: 0.15, b: 0.19 };
  const soluk: Renk = { r: 0.55, g: 0.58, b: 0.63 };
  const cizgi: Renk = { r: 0.85, g: 0.86, b: 0.88 };

  sayfa.kesikliCerceve(kutu.x, kutu.y, kutu.g, kutu.y_, cizgi);

  const merkezX = kutu.x + kutu.g / 2;
  const icGenislik = kutu.g - KART_IC * 2;
  // Üstten aşağı ilerleyen imleç: her blok kendinden sonrakine yer bırakır.
  let imlec = kutu.y + kutu.y_ - KART_IC;

  imlec -= 11;
  sayfa.ortalanmisMetin(
    merkezX,
    imlec,
    kisalt(secenekler.isletmeAdi, icGenislik, 11, true),
    11,
    marka,
    true,
  );

  imlec -= 6;
  for (const satir of satirlaraBol(secenekler.cagriMetni, icGenislik, 7.5, 2)) {
    imlec -= 9;
    sayfa.ortalanmisMetin(merkezX, imlec, satir, 7.5, koyu);
  }

  // Alt bloklar için ayrılan yer; kalanı QR'a veriliyor.
  const altBlok = 34;
  const qrAlan = imlec - (kutu.y + KART_IC + altBlok);
  const qrBoyut = Math.min(qrAlan, icGenislik);
  const qrY = kutu.y + KART_IC + altBlok + (qrAlan - qrBoyut) / 2;
  qrCiz(sayfa, matris, merkezX - qrBoyut / 2, qrY, qrBoyut, marka);

  sayfa.ortalanmisMetin(
    merkezX,
    kutu.y + KART_IC + 22,
    "Kamerayı karekoda tutmanız yeterli",
    6.5,
    soluk,
  );
  sayfa.dikdortgen(kutu.x + KART_IC, kutu.y + KART_IC + 16, icGenislik, 0.5, cizgi);
  sayfa.ortalanmisMetin(
    merkezX,
    kutu.y + KART_IC + 4,
    kisalt(kart.etiket, icGenislik, 9, true),
    9,
    koyu,
    true,
  );
}

/**
 * Kartları A4 sayfalarına dizip PDF üretir.
 *
 * QR'lar `qrcode` kütüphanesinin modül matrisinden okunur; hiç raster
 * görüntü üretilmez.
 */
export async function qrPdfUret(secenekler: QrPdfSecenekleri): Promise<Buffer> {
  const kutular = kartKutulari();
  const sayfalar: SayfaCizimi[] = [];

  for (let i = 0; i < secenekler.kartlar.length; i += SAYFA_BASINA) {
    const dilim = secenekler.kartlar.slice(i, i + SAYFA_BASINA);
    const sayfa = new SayfaCizimi();

    for (const [sira, kart] of dilim.entries()) {
      const qr = QRCode.create(kart.url, { errorCorrectionLevel: "M" });
      kartCiz(sayfa, kutular[sira], kart, qr.modules, secenekler);
    }
    sayfalar.push(sayfa);
  }

  // Hiç masa yoksa bile geçerli bir PDF dönmeli; boş sayfa, bozuk dosyadan iyi.
  if (sayfalar.length === 0) sayfalar.push(new SayfaCizimi());

  return pdfOlustur(sayfalar);
}
