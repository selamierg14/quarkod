import { SHIFTS, type Shift } from "./constants";
import { gunAdi, gunGirdisi } from "./gun";

/**
 * Vardiya çizelgesinin Excel tablosuna dönüşümü — ve geri.
 *
 * Panelde hücre hücre personel seçmek 7 gün × 4 vardiya × onlarca kişi
 * için çok yavaş; çok şubeli bir işletmede haftalık çizelge zaten Excel'de
 * hazırlanıyor. Bu dosya iki yönü de tek yerde ve saf fonksiyon olarak
 * tutuyor: dışa aktarılan tablo, aynı biçimde geri okunabiliyor (round-trip).
 *
 * Tablo biçimi bilinçli olarak "satır = personel, sütun = gün":
 * Excel'de çizelge insan gözüyle böyle okunur, hücreye vardiya adı yazılır.
 * Bir kişi aynı gün iki vardiyaya girebildiği için hücre virgülle çoklu
 * değer taşıyabilir ("Sabah, Akşam").
 *
 *   Personel      | Pazartesi 24.08 | Salı 25.08 | ...
 *   Ahmet Yılmaz  | Sabah           | Sabah, Akşam
 *   Ayşe Demir    |                 | Gece
 */

/** Dışa aktarımda ilk sütunun başlığı; içe aktarımda da bu aranır. */
export const PERSONEL_SUTUNU = "Personel";

export type TabloAtamasi = { userId: string; gun: string; shift: Shift };

/**
 * Çizelgeyi tabloya döker.
 *
 * Gün başlıkları "Pazartesi 24.08" biçiminde: içe aktarırken tarih
 * sütun sırasından değil başlıktan okunur, böylece kullanıcı Excel'de
 * sütunları taşısa bile hangi günün hangisi olduğu kaybolmaz.
 */
export function cizelgeyiTabloyaDok(
  personel: { id: string; name: string }[],
  gunler: Date[],
  atamalar: { userId: string; date: Date; shift: string }[],
  /**
   * Onaylı izinler (`userId|yyyy-aa-gg` → tür). Verilirse boş hücreler
   * "İzinli" yazar: çizelgeyi Excel'de dolduran kişi kimin o gün
   * olmadığını dosyada da görsün, boş hücreyi "unutulmuş" sanmasın.
   */
  izinKumesi?: Map<string, string>,
): string[][] {
  const anahtar = (userId: string, gun: string) => `${userId}|${gun}`;
  const hucreler = new Map<string, Shift[]>();

  for (const atama of atamalar) {
    if (!gecerliVardiya(atama.shift)) continue;
    const k = anahtar(atama.userId, gunGirdisi(atama.date));
    const mevcut = hucreler.get(k) ?? [];
    mevcut.push(atama.shift);
    hucreler.set(k, mevcut);
  }

  const baslik = [
    PERSONEL_SUTUNU,
    ...gunler.map((gun) => `${gunAdi(gun)} ${gunBasligiTarihi(gun)}`),
  ];

  const satirlar = personel.map((kisi) => [
    kisi.name,
    ...gunler.map((gun) => {
      const k = anahtar(kisi.id, gunGirdisi(gun));
      const vardiyalar = hucreler.get(k) ?? [];
      // SHIFTS sırasına göre yaz: aynı çizelge her dışa aktarımda aynı
      // görünsün (Set/Map sırası atama sırasına bağlı kalmasın).
      const metin = SIRALI_VARDIYALAR.filter((s) => vardiyalar.includes(s))
        .map((s) => SHIFTS[s])
        .join(", ");
      if (metin) return metin;
      // İzin yalnızca gerçekten boş hücreye yazılır: istisnaen izinliyken
      // atanmış birinin vardiyası dosyada kaybolmasın.
      return izinKumesi?.has(k) ? IZINLI_ETIKETI : "";
    }),
  ]);

  return [baslik, ...satirlar];
}

/**
 * Dışa aktarımda izinli günün hücre metni.
 *
 * İçe aktarmada bilerek bir vardiya adına karşılık gelmiyor: dosya geri
 * yüklendiğinde bu hücre "tanınmayan vardiya" uyarısı bile üretmeden
 * atlanır (bkz. tabloyuCizelgeyeCevir), yani izinli gün yanlışlıkla
 * vardiyaya dönüşmez.
 */
export const IZINLI_ETIKETI = "İzinli";

/** "24.08" — başlıkta yıl yok, sütun dar kalsın; yıl zaten dosya adında. */
function gunBasligiTarihi(gun: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(gun.getDate())}.${p(gun.getMonth() + 1)}`;
}

const SIRALI_VARDIYALAR = Object.keys(SHIFTS) as Shift[];

function gecerliVardiya(value: string): value is Shift {
  return value in SHIFTS;
}

/**
 * Vardiya adını çözer: "Sabah", "sabah", " SABAH " ve İngilizce anahtarın
 * kendisi ("sabah") kabul edilir.
 *
 * Türkçe büyük/küçük harf tuzağı: "İ".toLowerCase() ile "i" farklı
 * kodlara düşebiliyor, bu yüzden karşılaştırma locale'e duyarlı yapılıyor
 * ("Öğle" → "öğle").
 */
export function vardiyaCoz(metin: string): Shift | null {
  const sade = metin.trim().toLocaleLowerCase("tr");
  if (!sade) return null;
  for (const [anahtar, etiket] of Object.entries(SHIFTS)) {
    if (sade === anahtar || sade === etiket.toLocaleLowerCase("tr")) {
      return anahtar as Shift;
    }
  }
  return null;
}

/**
 * Başlıktaki "Pazartesi 24.08" ifadesinden gün anahtarını (yyyy-aa-gg)
 * çıkarır. Yıl başlıkta yok; çizelgenin ait olduğu haftanın günleri
 * arasından gün+ay eşleşeni bulunur — yıl sonu haftalarında (31.12–01.01)
 * iki farklı yıla düşen günler bu sayede doğru eşleşir.
 */
export function gunBasligindanAnahtar(baslik: string, gunler: Date[]): string | null {
  const eslesme = baslik.match(/(\d{1,2})[.\-/](\d{1,2})/);
  if (!eslesme) return null;
  const gun = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const bulunan = gunler.find(
    (d) => d.getDate() === gun && d.getMonth() + 1 === ay,
  );
  return bulunan ? gunGirdisi(bulunan) : null;
}

export type TabloOkumaSonucu = {
  atamalar: TabloAtamasi[];
  /** Kullanıcıya gösterilecek satır bazlı uyarılar; işlemi durdurmaz. */
  uyarilar: string[];
};

/**
 * Tabloyu çizelgeye çevirir.
 *
 * Tanınmayan isim ya da vardiya sessizce yutulmuyor: her biri uyarı olarak
 * dönüyor. Excel'de bir ismin yanlış yazılması çizelgenin yarısını sessizce
 * boş bırakabilirdi — kullanıcı neyin girmediğini görmeli.
 *
 * İsim eşleştirme locale'e duyarlı ve boşluk toleranslı; aynı ada sahip iki
 * personel varsa hangisi kastedildiği belirsiz olduğu için ikisi de
 * eşleştirilmez ve uyarı verilir.
 */
export function tabloyuCizelgeyeCevir(
  satirlar: string[][],
  personel: { id: string; name: string }[],
  gunler: Date[],
  etkinVardiyalar: Shift[],
): TabloOkumaSonucu {
  const uyarilar: string[] = [];
  const atamalar: TabloAtamasi[] = [];

  const dolu = satirlar.filter((s) => s.some((h) => h.trim() !== ""));
  if (dolu.length < 2) {
    return { atamalar, uyarilar: ["Dosyada başlık satırından başka satır yok."] };
  }

  const [baslik, ...govde] = dolu;

  // Sütun sırası kullanıcıya bırakılmış: hangi sütunun hangi gün olduğu
  // başlıktan okunuyor (bkz. gunBasligindanAnahtar).
  const sutunGunu = baslik.map((h, i) =>
    i === 0 ? null : gunBasligindanAnahtar(h, gunler),
  );
  if (sutunGunu.every((g) => g === null)) {
    return {
      atamalar,
      uyarilar: [
        "Başlık satırında bu haftaya ait hiçbir gün bulunamadı. " +
          "Dosyayı önce panelden dışa aktarıp o dosyanın üzerine yazın.",
      ],
    };
  }

  const isimIndeksi = isimHaritasi(personel);

  for (const satir of govde) {
    const ham = (satir[0] ?? "").trim();
    if (!ham) continue;

    const eslesen = isimIndeksi.get(isimAnahtari(ham));
    if (eslesen === undefined) {
      uyarilar.push(`"${ham}" adlı personel bulunamadı; bu satır atlandı.`);
      continue;
    }
    if (eslesen === COKLU) {
      uyarilar.push(
        `"${ham}" adında birden fazla personel var; hangisi olduğu ` +
          `anlaşılamadı, bu satır atlandı.`,
      );
      continue;
    }

    for (let i = 1; i < satir.length; i++) {
      const gun = sutunGunu[i];
      if (!gun) continue;

      const hucre = (satir[i] ?? "").trim();
      if (!hucre) continue;

      for (const parca of hucre.split(/[,;/]/)) {
        if (!parca.trim()) continue;
        // Dışa aktarımın kendi yazdığı "İzinli" etiketi bir vardiya değil;
        // round-trip'te her izinli gün için uyarı üretmesin diye sessizce
        // atlanıyor (bkz. IZINLI_ETIKETI).
        if (parca.trim().toLocaleLowerCase("tr") === IZINLI_ETIKETI.toLocaleLowerCase("tr")) {
          continue;
        }
        const shift = vardiyaCoz(parca);
        if (!shift) {
          uyarilar.push(`"${ham}" satırında tanınmayan vardiya: "${parca.trim()}".`);
          continue;
        }
        if (!etkinVardiyalar.includes(shift)) {
          uyarilar.push(
            `"${SHIFTS[shift]}" vardiyası bu işletmede kapalı; ` +
              `"${ham}" için atlandı.`,
          );
          continue;
        }
        atamalar.push({ userId: eslesen, gun, shift });
      }
    }
  }

  return { atamalar: tekilAtamalar(atamalar), uyarilar };
}

/** Aynı kişi-gün-vardiya üçlüsü dosyada iki kez geçse bile bir kez atanır. */
function tekilAtamalar(atamalar: TabloAtamasi[]): TabloAtamasi[] {
  const gorulen = new Set<string>();
  return atamalar.filter((a) => {
    const k = `${a.userId}|${a.gun}|${a.shift}`;
    if (gorulen.has(k)) return false;
    gorulen.add(k);
    return true;
  });
}

/** Aynı ada sahip birden fazla personel olduğunu işaretleyen nöbetçi değer. */
const COKLU = Symbol("coklu");

function isimAnahtari(ad: string): string {
  // Excel'de kopyalanan isimlerde çift boşluk ve gizli boşluklar sık;
  // karşılaştırma bunlara takılmamalı.
  return ad.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr");
}

function isimHaritasi(
  personel: { id: string; name: string }[],
): Map<string, string | typeof COKLU> {
  const harita = new Map<string, string | typeof COKLU>();
  for (const kisi of personel) {
    const anahtar = isimAnahtari(kisi.name);
    harita.set(anahtar, harita.has(anahtar) ? COKLU : kisi.id);
  }
  return harita;
}

/**
 * CSV metnini satırlara ayırır.
 *
 * Excel'in Türkçe yerelde ürettiği dosya noktalı virgülle ayrılır ve
 * hücrede virgül/satır sonu varsa tırnağa alınır. Tarayıcıdan gelen
 * dosyayı olduğu gibi kabul edebilmek için ayraç ilk satırdan sezgisel
 * olarak bulunuyor: kullanıcı dosyayı Excel yerine Google Sheets'ten
 * (virgüllü) indirdiyse de çalışsın.
 */
export function csvAyristir(metin: string): string[][] {
  const govde = metin.replace(/^﻿/, "");
  const ayrac = ayraciSez(govde);

  const satirlar: string[][] = [];
  let satir: string[] = [];
  let hucre = "";
  let tirnakta = false;

  for (let i = 0; i < govde.length; i++) {
    const karakter = govde[i];

    if (tirnakta) {
      if (karakter === '"') {
        // İki tırnak üst üste: hücre içindeki gerçek tırnak karakteri.
        if (govde[i + 1] === '"') {
          hucre += '"';
          i++;
        } else {
          tirnakta = false;
        }
      } else {
        hucre += karakter;
      }
      continue;
    }

    if (karakter === '"') {
      tirnakta = true;
    } else if (karakter === ayrac) {
      satir.push(hucre);
      hucre = "";
    } else if (karakter === "\n") {
      satir.push(hucre);
      satirlar.push(satir);
      satir = [];
      hucre = "";
    } else if (karakter !== "\r") {
      hucre += karakter;
    }
  }

  if (hucre !== "" || satir.length > 0) {
    satir.push(hucre);
    satirlar.push(satir);
  }

  return satirlar;
}

/** İlk satırda hangi ayraç daha çok geçiyorsa o kabul edilir. */
function ayraciSez(metin: string): string {
  const ilkSatir = metin.split(/\r?\n/, 1)[0] ?? "";
  const noktaliVirgul = (ilkSatir.match(/;/g) ?? []).length;
  const virgul = (ilkSatir.match(/,/g) ?? []).length;
  const sekme = (ilkSatir.match(/\t/g) ?? []).length;
  if (sekme > noktaliVirgul && sekme > virgul) return "\t";
  return virgul > noktaliVirgul ? "," : ";";
}
