/**
 * Elle PDF yazan minik bir yardımcı.
 *
 * Neden hazır kütüphane değil: matbaaya giden bir dosyada QR'ın vektörel
 * olması gerekiyor. Rasterleştirilmiş bir PNG, 5 cm'ye basıldığında
 * kenarları kırık çıkar ve okutma oranını düşürür. Modül karesini doğrudan
 * PDF dikdörtgeni olarak çizdiğimizde çıktı hangi boyutta basılırsa
 * basılsın keskin kalıyor, dosya da birkaç yüz KB yerine birkaç on KB oluyor.
 *
 * Kapsam bilinçli olarak dar: düz metin (Helvetica), dolu dikdörtgen ve
 * kesikli çizgi. Bundan fazlası gerekirse kütüphaneye geçmek daha doğru olur.
 */

/** PDF nokta cinsinden A4. 1 pt = 1/72 inç. */
export const A4 = { genislik: 595.28, yukseklik: 841.89 } as const;

export type Renk = { r: number; g: number; b: number };

/**
 * "#1a2b3c" → 0-1 aralığında RGB.
 *
 * PDF renkleri 0-1 ondalığıyla ister. Tanınmayan değerde siyaha düşüyoruz:
 * baskıda yanlış renk, hiç renk olmamasından daha kötü.
 */
export function hexToRgb(hex: string): Renk {
  const temiz = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!temiz) return { r: 0, g: 0, b: 0 };
  const sayi = parseInt(temiz[1], 16);
  return {
    r: ((sayi >> 16) & 255) / 255,
    g: ((sayi >> 8) & 255) / 255,
    b: (sayi & 255) / 255,
  };
}

/**
 * Türkçe harflerin WinAnsi'de karşılığı yok; PDF'e /Differences ile
 * tanıtıyoruz. Anahtar: bizim atadığımız bayt kodu, değer: PostScript glif
 * adı. Helvetica yerine geçen tüm yaygın yazı tipleri (Arial, Liberation
 * Sans, Nimbus Sans) bu glifleri taşıyor.
 */
const TR_GLIFLER: Record<string, { kod: number; glif: string }> = {
  "ş": { kod: 0x80, glif: "scedilla" },
  "Ş": { kod: 0x81, glif: "Scedilla" },
  "ğ": { kod: 0x82, glif: "gbreve" },
  "Ğ": { kod: 0x83, glif: "Gbreve" },
  "ı": { kod: 0x84, glif: "dotlessi" },
  "İ": { kod: 0x85, glif: "Idotaccent" },
  "ç": { kod: 0x86, glif: "ccedilla" },
  "Ç": { kod: 0x87, glif: "Ccedilla" },
  "ö": { kod: 0x88, glif: "odieresis" },
  "Ö": { kod: 0x89, glif: "Odieresis" },
  "ü": { kod: 0x8a, glif: "udieresis" },
  "Ü": { kod: 0x8b, glif: "Udieresis" },
};

/** /Encoding sözlüğündeki /Differences dizisi. */
function differencesDizisi(): string {
  const girisler = Object.values(TR_GLIFLER).sort((a, b) => a.kod - b.kod);
  return girisler.map((g) => `${g.kod} /${g.glif}`).join(" ");
}

/**
 * Metni PDF dizesi olarak kaçışlar.
 *
 * Türkçe harfler yukarıdaki özel kodlara, ASCII dışında kalan ve
 * tanımadığımız her şey "?" işaretine düşer — çünkü tanımsız bir bayt
 * baskıda rastgele bir glif olarak çıkar ve bu fark edilmez.
 */
export function pdfMetin(text: string): string {
  let cikti = "";
  for (const ch of text) {
    const tr = TR_GLIFLER[ch];
    if (tr) {
      cikti += `\\${tr.kod.toString(8).padStart(3, "0")}`;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === "\\") {
      cikti += `\\${ch}`;
      continue;
    }
    const kod = ch.codePointAt(0) ?? 63;
    cikti += kod >= 32 && kod <= 126 ? ch : "?";
  }
  return cikti;
}

/**
 * Helvetica'da metnin yaklaşık genişliği (punto cinsinden).
 *
 * Gerçek genişlik tablosu yerine ortalama oran kullanıyoruz: bize gereken
 * tek şey metni ortalamak ve kutuya sığmayanı kısaltmak. Yarım puntoluk
 * sapma baskıda görünmez.
 */
export function metinGenisligi(text: string, punto: number, kalin: boolean): number {
  const oran = kalin ? 0.58 : 0.52;
  return text.length * punto * oran;
}

/** Verilen genişliğe sığmıyorsa sonuna "…" koyarak kısaltır. */
export function kisalt(text: string, maxGenislik: number, punto: number, kalin: boolean): string {
  if (metinGenisligi(text, punto, kalin) <= maxGenislik) return text;
  let kesik = text;
  while (kesik.length > 1 && metinGenisligi(`${kesik}...`, punto, kalin) > maxGenislik) {
    kesik = kesik.slice(0, -1);
  }
  return `${kesik.trimEnd()}...`;
}

/** Bir sayfanın içerik akışını biriktirir. */
export class SayfaCizimi {
  private parcalar: string[] = [];

  /** Dolu dikdörtgen. PDF'te y ekseni aşağıdan yukarı sayılır. */
  dikdortgen(x: number, y: number, genislik: number, yukseklik: number, renk: Renk): this {
    this.parcalar.push(
      `${f(renk.r)} ${f(renk.g)} ${f(renk.b)} rg`,
      `${f(x)} ${f(y)} ${f(genislik)} ${f(yukseklik)} re f`,
    );
    return this;
  }

  /** Kesikli çerçeve — matbaanın kesim kılavuzu. */
  kesikliCerceve(
    x: number,
    y: number,
    genislik: number,
    yukseklik: number,
    renk: Renk,
    kalinlik = 0.4,
  ): this {
    this.parcalar.push(
      `${f(renk.r)} ${f(renk.g)} ${f(renk.b)} RG`,
      `${f(kalinlik)} w`,
      "[3 3] 0 d",
      `${f(x)} ${f(y)} ${f(genislik)} ${f(yukseklik)} re S`,
      "[] 0 d",
    );
    return this;
  }

  /** Sol alt köşesi (x, y) olan tek satır metin. */
  metin(
    x: number,
    y: number,
    text: string,
    punto: number,
    renk: Renk,
    kalin = false,
  ): this {
    this.parcalar.push(
      "BT",
      `/${kalin ? "FB" : "FR"} ${f(punto)} Tf`,
      `${f(renk.r)} ${f(renk.g)} ${f(renk.b)} rg`,
      `${f(x)} ${f(y)} Td`,
      `(${pdfMetin(text)}) Tj`,
      "ET",
    );
    return this;
  }

  /** Merkezi (merkezX, y) olan tek satır metin. */
  ortalanmisMetin(
    merkezX: number,
    y: number,
    text: string,
    punto: number,
    renk: Renk,
    kalin = false,
  ): this {
    const x = merkezX - metinGenisligi(text, punto, kalin) / 2;
    return this.metin(x, y, text, punto, renk, kalin);
  }

  icerik(): string {
    return this.parcalar.join("\n");
  }
}

/** Ondalıkları kısaltır: dosya boyutu QR'larda hızla şişiyor. */
function f(sayi: number): string {
  return Number(sayi.toFixed(2)).toString();
}

/**
 * Sayfaları tek bir PDF dosyasına dizer.
 *
 * xref tablosundaki bayt konumları birebir doğru olmak zorunda; bu yüzden
 * gövdeyi latin1 olarak ölçüp yazıyoruz (metinlerimiz tek baytlık kodlara
 * çevrildiği için bu güvenli).
 */
export function pdfOlustur(sayfalar: SayfaCizimi[]): Buffer {
  const nesneler: string[] = [];
  /** 1'den başlayan nesne numarası döner. */
  const ekle = (govde: string) => {
    nesneler.push(govde);
    return nesneler.length;
  };

  // Nesne numaralarını önden ayırıyoruz: Pages, çocuklarına referans
  // vermek zorunda ve çocuklar da ebeveynine.
  const katalogNo = 1;
  const sayfalarNo = 2;
  const fontDuzNo = 3;
  const fontKalinNo = 4;
  const encodingNo = 5;
  const ilkSayfaNo = 6;

  const sayfaNolari = sayfalar.map((_, i) => ilkSayfaNo + i * 2);
  const icerikNolari = sayfalar.map((_, i) => ilkSayfaNo + i * 2 + 1);

  ekle(`<< /Type /Catalog /Pages ${sayfalarNo} 0 R >>`);
  ekle(
    `<< /Type /Pages /Count ${sayfalar.length} /Kids [${sayfaNolari
      .map((n) => `${n} 0 R`)
      .join(" ")}] >>`,
  );
  ekle(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding ${encodingNo} 0 R >>`,
  );
  ekle(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding ${encodingNo} 0 R >>`,
  );
  ekle(
    `<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [${differencesDizisi()}] >>`,
  );

  sayfalar.forEach((sayfa, i) => {
    ekle(
      `<< /Type /Page /Parent ${sayfalarNo} 0 R ` +
        `/MediaBox [0 0 ${A4.genislik} ${A4.yukseklik}] ` +
        `/Resources << /Font << /FR ${fontDuzNo} 0 R /FB ${fontKalinNo} 0 R >> >> ` +
        `/Contents ${icerikNolari[i]} 0 R >>`,
    );
    const icerik = sayfa.icerik();
    ekle(
      `<< /Length ${Buffer.byteLength(icerik, "latin1")} >>\nstream\n${icerik}\nendstream`,
    );
  });

  let govde = "%PDF-1.4\n";
  const konumlar: number[] = [];
  nesneler.forEach((nesne, i) => {
    konumlar.push(Buffer.byteLength(govde, "latin1"));
    govde += `${i + 1} 0 obj\n${nesne}\nendobj\n`;
  });

  const xrefKonumu = Buffer.byteLength(govde, "latin1");
  govde += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n`;
  for (const konum of konumlar) {
    govde += `${konum.toString().padStart(10, "0")} 00000 n \n`;
  }
  govde +=
    `trailer\n<< /Size ${nesneler.length + 1} /Root ${katalogNo} 0 R >>\n` +
    `startxref\n${xrefKonumu}\n%%EOF\n`;

  return Buffer.from(govde, "latin1");
}
