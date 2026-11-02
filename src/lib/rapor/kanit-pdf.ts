import { A4, SayfaCizimi, hexToRgb, metinGenisligi, pdfOlustur, type Renk } from "./pdf";

/**
 * Rıza kanıt belgesi — "bu izni gerçekten aldık" sorusuna tek tıkla
 * gösterilebilecek bir cevap. TSA imzalı, kripto garantili bir zaman
 * damgası değil; sistemde zaten tutulan kanıtı (onay metni, IP, tarih)
 * sunulabilir hale getiriyor.
 */
export type KanitVerisi = {
  isletmeAdi: string;
  brandColor: string;
  /** "Pazarlama izni (İYS)" | "İletişim rızası (KVKK)" */
  tur: string;
  alici: string;
  kanal: string;
  onayTarihi: string;
  metinSurumu: string | null;
  onayMetni: string | null;
  ipAdresi: string | null;
  belgeNo: string;
  uretimTarihi: string;
};

const SIYAH: Renk = { r: 0.06, g: 0.09, b: 0.16 };
const GRI: Renk = { r: 0.42, g: 0.45, b: 0.5 };
const SOLUK_GRI: Renk = { r: 0.62, g: 0.65, b: 0.69 };

const SOL = 56;
const SAG = A4.genislik - 56;
const GENISLIK = SAG - SOL;

function satirlaraBol(text: string, maxGenislik: number, punto: number): string[] {
  const kelimeler = text.split(/\s+/).filter(Boolean);
  const satirlar: string[] = [];
  let mevcut = "";
  for (const kelime of kelimeler) {
    const aday = mevcut ? `${mevcut} ${kelime}` : kelime;
    if (mevcut && metinGenisligi(aday, punto, false) > maxGenislik) {
      satirlar.push(mevcut);
      mevcut = kelime;
    } else {
      mevcut = aday;
    }
  }
  if (mevcut) satirlar.push(mevcut);
  return satirlar.length > 0 ? satirlar : [""];
}

export function kanitPdfUret(veri: KanitVerisi): Buffer {
  const marka = hexToRgb(veri.brandColor);
  const sayfa = new SayfaCizimi();
  let y = A4.yukseklik - 70;

  // --- Üst şerit
  sayfa.dikdortgen(0, A4.yukseklik - 8, A4.genislik, 8, marka);

  sayfa.metin(SOL, y, "RIZA KANIT BELGESİ", 18, SIYAH, true);
  y -= 20;
  sayfa.metin(SOL, y, veri.isletmeAdi, 11, GRI);
  y -= 34;

  const alan = (etiket: string, deger: string) => {
    sayfa.metin(SOL, y, etiket, 9, GRI, true);
    sayfa.metin(SOL + 140, y, deger || "—", 10, SIYAH);
    y -= 20;
  };

  alan("Belge no", veri.belgeNo);
  alan("Kayıt türü", veri.tur);
  alan("Alıcı", veri.alici);
  alan("Kanal", veri.kanal);
  alan("Onay tarihi", veri.onayTarihi);
  alan("Metin sürümü", veri.metinSurumu ?? "—");
  alan("Kaydedilen IP", veri.ipAdresi ?? "—");

  y -= 12;
  sayfa.metin(SOL, y, "ONAY ANINDA GÖSTERİLEN METİN", 9, GRI, true);
  y -= 18;

  if (veri.onayMetni) {
    for (const satir of satirlaraBol(veri.onayMetni, GENISLIK, 10)) {
      sayfa.metin(SOL, y, satir, 10, SIYAH);
      y -= 15;
    }
  } else {
    sayfa.metin(SOL, y, "Bu kayıt için metin kopyası tutulmamış.", 10, GRI);
    y -= 15;
  }

  // --- Alt bilgi
  sayfa.metin(
    SOL,
    64,
    `Bu belge ${veri.uretimTarihi} tarihinde sistem tarafından, o an veritabanında ` +
      "kayıtlı bilgilerden üretilmiştir. Nitelikli elektronik zaman damgası içermez.",
    8,
    SOLUK_GRI,
  );

  return pdfOlustur([sayfa]);
}
