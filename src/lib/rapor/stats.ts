import "server-only";
import { prisma } from "../cekirdek/db";
import { SHIFTS, type Shift } from "../cekirdek/constants";
import { detaylariCoz } from "../isletme/anket-detay";
import { etkinVardiyalar } from "../personel/vardiya";
import { gunGirdisi } from "../cekirdek/gun";

export type TrendPoint = {
  /** Hafta başlangıcı (pazartesi). */
  start: Date;
  label: string;
  count: number;
  average: number | null;
};

export type BusinessStats = {
  id: string;
  name: string;
  slug: string;
  brandColor: string;
  notifyThreshold: number;
  total: number;
  average: number | null;
  openComplaints: number;
  last7Days: number;
  last30Average: number | null;
  /** Önceki 30 günün ortalaması — değişim bundan hesaplanır. */
  prev30Average: number | null;
  /** Son 30 gün ile önceki 30 gün arasındaki fark (puan). */
  delta: number | null;
  /** 5 yıldız verip Google butonu gösterilen müşteri sayısı. */
  googleShown: number;
  /** O butona gerçekten tıklayan müşteri sayısı. */
  googleClicked: number;
  /** Son 90 günde en zayıf kategoriler (ortalaması düşükten yükseğe). */
  weakCategories: { name: string; average: number; count: number }[];
  /**
   * Düşük puanlarda en çok işaretlenen sorun alanları, çoktan aza.
   *
   * "Temizlik 2.1/5" patrona nereye bakacağını söylemiyor; "Temizlik →
   * Tuvaletler, 8 kez" söylüyor. Kategori ortalamasının bir kademe altı.
   */
  topProblems: { kategori: string; alan: string; count: number }[];
  trend: TrendPoint[];
  /** Anket ekranını açan tekil ziyaretçi sayısı. */
  views: number;
  /** Görüntüleme ölçümü başladıktan sonra gelen geri bildirim sayısı. */
  feedbacksSinceTracking: number;
  /** Açanların yüzde kaçı anketi gönderdi (0-100). */
  completionRate: number | null;
  /** Çözülen şikayetlerde ortalama çözüm süresi (saat). */
  avgResolutionHours: number | null;
};

export type ShiftBreakdown = {
  shift: string;
  label: string;
  count: number;
  average: number | null;
};

export type TableBreakdown = {
  tableId: string;
  label: string;
  count: number;
  average: number | null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Kategori analizi penceresi: eski şikayetler bugünkü tabloyu bulandırmasın. */
const CATEGORY_WINDOW_DAYS = 90;

const TREND_WEEKS = 12;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

/** Verilen tarihin içinde bulunduğu pazartesi (00:00). */
function weekStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = (result.getDay() + 6) % 7; // pazartesi = 0
  result.setDate(result.getDate() - day);
  return result;
}


/**
 * Ortalama "doldurma süresi": anketin açıldığı an (SurveyView) ile
 * gönderildiği an (Feedback.createdAt) arasındaki fark. Gerçek masa devir
 * hızı değil — müşterinin QR'ı okutup anketi tamamlamasının ne kadar
 * sürdüğünün kaba bir göstergesi. Aynı ziyaretçi+masa eşleşmesi üzerinden
 * hesaplanır; bir saatten uzun aralıklar (muhtemelen alakasız bir önceki
 * ziyaret) elenir.
 */
export async function getDoldurmaSuresi(
  businessIds: string[],
  days = 30,
): Promise<{ ortalamaSaniye: number; adet: number } | null> {
  const since = daysAgo(days);

  const [feedbacks, views] = await Promise.all([
    prisma.feedback.findMany({
      where: {
        businessId: { in: businessIds },
        createdAt: { gte: since },
        visitorId: { not: null },
        tableId: { not: null },
      },
      select: { tableId: true, visitorId: true, createdAt: true },
    }),
    prisma.surveyView.findMany({
      where: {
        businessId: { in: businessIds },
        createdAt: { gte: since },
        visitorId: { not: null },
        tableId: { not: null },
      },
      select: { tableId: true, visitorId: true, createdAt: true },
    }),
  ]);

  if (feedbacks.length === 0 || views.length === 0) return null;

  const gorenler = new Map<string, Date[]>();
  for (const v of views) {
    const anahtar = `${v.visitorId}:${v.tableId}`;
    const liste = gorenler.get(anahtar) ?? [];
    liste.push(v.createdAt);
    gorenler.set(anahtar, liste);
  }
  for (const liste of gorenler.values()) liste.sort((a, b) => a.getTime() - b.getTime());

  let toplamSaniye = 0;
  let adet = 0;
  const BIR_SAAT = 60 * 60;

  for (const f of feedbacks) {
    const anahtar = `${f.visitorId}:${f.tableId}`;
    const liste = gorenler.get(anahtar);
    if (!liste) continue;

    // O anketten önceki en yakın görüntüleme.
    let enYakin: Date | null = null;
    for (const t of liste) {
      if (t.getTime() <= f.createdAt.getTime()) enYakin = t;
      else break;
    }
    if (!enYakin) continue;

    const fark = (f.createdAt.getTime() - enYakin.getTime()) / 1000;
    if (fark > 0 && fark < BIR_SAAT) {
      toplamSaniye += fark;
      adet += 1;
    }
  }

  if (adet === 0) return null;
  return { ortalamaSaniye: toplamSaniye / adet, adet };
}

export type AnketHunisi = {
  goruntuleme: number;
  yildizVerdi: number;
  gonderildi: number;
};

/**
 * "Nerede bırakıyorlar" hunisi.
 *
 * Üç basamak, üç farklı sorunu ayırt eder: QR okutulmuyorsa (görüntüleme
 * düşük) kart/masa yerleşimi sorunu; yıldız verilmiyorsa (görüntüleme var,
 * yıldız yok) ilk ekran ilgi çekmiyor; yıldız verilip gönderilmiyorsa
 * (yıldız var, gönderim yok) anketin geri kalanı çok uzun ya da rahatsız
 * edici. Üçü de aynı sayıyla karışsaydı hangisini düzelteceğimizi
 * bilemezdik.
 *
 * Görüntüleme ve yıldız aynı SurveyView satırından geliyor (bkz.
 * recordSurveyStart) — iki ayrı sayaç değil, tek satırın iki durumu.
 */
export async function getAnketHunisi(
  businessIds: string[],
  days = 30,
): Promise<AnketHunisi> {
  const since = daysAgo(days);
  const where = { businessId: { in: businessIds }, createdAt: { gte: since } };

  const [goruntuleme, yildizVerdi, gonderildi] = await Promise.all([
    prisma.surveyView.count({ where }),
    prisma.surveyView.count({ where: { ...where, yildizVerildi: true } }),
    prisma.feedback.count({ where }),
  ]);

  return { goruntuleme, yildizVerdi, gonderildi };
}

export type PersonelPerformans = {
  userId: string;
  name: string;
  role: string;
  /** Bu dönemde atandığı vardiya sayısı — hiç atanmadıysa ortalama zaten null. */
  vardiyaSayisi: number;
  /** Ortalamaya giren geri bildirim sayısı; az veriyle yanıltıcı ortalama gösterilmesin diye. */
  kayitSayisi: number;
  ortalama: number | null;
  /** Önceki eşit uzunluktaki döneme göre değişim; ikisi de veri içermiyorsa null. */
  delta: number | null;
};

/**
 * Personel performans kartı — yalnızca sahip/yönetici görür, personelin
 * kendisi görmez (bkz. vardiya-planlama/performans sayfası, requirePersonelYonetimi
 * + garson zaten requireTenant'ta ayrı bir moda düşüyor).
 *
 * ÖNEMLİ SINIR: bu, "müşteri Ahmet'i puanladı" demek DEĞİL. Sistemde geri
 * bildirim kime değil hangi vardiyaya bağlı; aynı vardiyada iki kişi
 * çalışıyorsa o vardiyanın puanı ikisine de aynen yazılır. Sayı "Ahmet'in
 * çalıştığı vardiyalar genel olarak nasıl geçmiş" sorusuna cevap verir,
 * "Ahmet'in servisi nasılmış" sorusuna değil — panelde bu ayrım metinle
 * de belirtiliyor, aksi halde tek kişilik bir vardiyada kötü geçen bir gün
 * yanında biriyle çalışan birine haksız yere yazılabilir.
 */
export async function getPersonelPerformansi(
  businessId: string,
  days = 30,
): Promise<PersonelPerformans[]> {
  const simdi = new Date();
  const buDonemBasi = daysAgo(days);
  const oncekiDonemBasi = daysAgo(days * 2);

  const [atamalar, geriBildirimler, personel] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: { businessId, date: { gte: oncekiDonemBasi } },
      select: { userId: true, date: true, shift: true },
    }),
    prisma.feedback.findMany({
      where: { businessId, createdAt: { gte: oncekiDonemBasi }, shift: { not: null } },
      select: { createdAt: true, shift: true, overallRating: true },
    }),
    prisma.user.findMany({
      where: { businessId, active: true, role: { in: ["manager", "garson"] } },
      select: { id: true, name: true, role: true },
    }),
  ]);

  // "gün:vardiya" -> o dilimde bırakılan puanlar. Kim çalışırsa çalışsın
  // aynı havuzdan besleniyor; ayrım yalnızca kimin o gün+vardiyada
  // atanmış olduğuna bakılarak yapılıyor.
  const puanlarByGunVardiya = new Map<string, number[]>();
  for (const f of geriBildirimler) {
    if (!f.shift) continue;
    const anahtar = `${gunGirdisi(f.createdAt)}:${f.shift}`;
    const liste = puanlarByGunVardiya.get(anahtar) ?? [];
    liste.push(f.overallRating);
    puanlarByGunVardiya.set(anahtar, liste);
  }

  function donemOrtalamasi(userId: string, baslangic: Date, bitis: Date) {
    let toplam = 0;
    let kayit = 0;
    let vardiya = 0;
    for (const a of atamalar) {
      if (a.userId !== userId) continue;
      if (a.date < baslangic || a.date >= bitis) continue;
      vardiya++;
      const liste = puanlarByGunVardiya.get(`${gunGirdisi(a.date)}:${a.shift}`);
      if (!liste) continue;
      for (const puan of liste) {
        toplam += puan;
        kayit++;
      }
    }
    return {
      ortalama: kayit > 0 ? round(toplam / kayit, 2) : null,
      kayit,
      vardiya,
    };
  }

  return personel
    .map((p) => {
      const guncel = donemOrtalamasi(p.id, buDonemBasi, simdi);
      const onceki = donemOrtalamasi(p.id, oncekiDonemBasi, buDonemBasi);
      const delta =
        guncel.ortalama !== null && onceki.ortalama !== null
          ? round(guncel.ortalama - onceki.ortalama, 1)
          : null;
      return {
        userId: p.id,
        name: p.name,
        role: p.role,
        vardiyaSayisi: guncel.vardiya,
        kayitSayisi: guncel.kayit,
        ortalama: guncel.ortalama,
        delta,
      };
    })
    .sort((a, b) => (b.ortalama ?? -1) - (a.ortalama ?? -1));
}

/**
 * Vardiyaya göre kırılım. Vardiya etiketi her kayda otomatik yazılıyor;
 * "gece vardiyasında puan düşüyor" gibi bir bulgu doğrudan personel kararına
 * dönüştüğü için ayrı bir görünüm hak ediyor.
 *
 * `window`: ya kayan bir pencere (`{ from }`, "bugünden geriye N gün") ya da
 * kapalı bir aralık (`{ from, to }`, "şu haftanın günleri"). Rapor sayfası
 * ilkini, vardiya çizelgesi ikincisini kullanıyor — çizelgede "3 hafta önce"
 * görünümüne gelen birine BUGÜNE göre kayan bir ortalama gösterilirse, o
 * hafta hiç veri içermese bile başka haftaların puanı sanki oradaymış gibi
 * görünür.
 */
export async function getShiftBreakdown(
  businessIds: string[],
  window: { from: Date; to?: Date } = { from: daysAgo(30) },
): Promise<ShiftBreakdown[]> {
  const [grouped, businesses] = await Promise.all([
    prisma.feedback.groupBy({
      by: ["shift"],
      where: {
        businessId: { in: businessIds },
        createdAt: window.to
          ? { gte: window.from, lt: window.to }
          : { gte: window.from },
        shift: { not: null },
      },
      _avg: { overallRating: true },
      _count: { _all: true },
    }),
    prisma.business.findMany({ where: { id: { in: businessIds } } }),
  ]);

  const map = new Map(grouped.map((row) => [row.shift, row]));

  // Birden fazla işletme seçiliyse birleşim gösterilir: hangi vardiyayı
  // en az biri kullanıyorsa satırı vardır — aksi halde tek işletmenin
  // kapattığı bir vardiya diğerlerinde veri varken gizlenirdi.
  const kullanilanlar = new Set<Shift>();
  for (const business of businesses) {
    for (const shift of etkinVardiyalar(business)) kullanilanlar.add(shift);
  }

  return (Object.keys(SHIFTS) as Shift[])
    .filter((shift) => kullanilanlar.has(shift))
    .map((shift) => {
      const row = map.get(shift);
      return {
        shift,
        label: SHIFTS[shift],
        count: row?._count._all ?? 0,
        average:
          row?._avg.overallRating != null ? round(row._avg.overallRating, 2) : null,
      };
    });
}

/** Masaya göre kırılım — hangi masa/bölge sürekli şikayet alıyor. */
export async function getTableBreakdown(
  businessIds: string[],
  days = 30,
): Promise<TableBreakdown[]> {
  const grouped = await prisma.feedback.groupBy({
    by: ["tableId"],
    where: {
      businessId: { in: businessIds },
      createdAt: { gte: daysAgo(days) },
      tableId: { not: null },
    },
    _avg: { overallRating: true },
    _count: { _all: true },
  });

  const tables = await prisma.table.findMany({
    where: { id: { in: grouped.map((row) => row.tableId as string) } },
    select: { id: true, tableNumber: true, isEntrance: true },
  });
  const labels = new Map(
    tables.map((table) => [
      table.id,
      table.isEntrance ? "Giriş" : `Masa ${table.tableNumber}`,
    ]),
  );

  return grouped
    .map((row) => ({
      tableId: row.tableId as string,
      label: labels.get(row.tableId as string) ?? "—",
      count: row._count._all,
      average:
        row._avg.overallRating != null ? round(row._avg.overallRating, 2) : null,
    }))
    .sort((a, b) => (a.average ?? 5) - (b.average ?? 5));
}

/**
 * Kapsam zorunlu: parametre isteğe bağlı olsaydı, çağrıyı unutan bir sayfa
 * sessizce bütün kiracıların verisini gösterirdi.
 */
/**
 * Birden çok işletmenin özet istatistikleri.
 *
 * SORGU SAYISI İŞLETME SAYISINDAN BAĞIMSIZ. Önceki hâli her işletme için
 * ayrı ayrı ~13 sorgu atıyordu (`businesses.map(async ...)` içinde bir
 * `Promise.all`). Ölçüldüğünde tablo şuydu:
 *
 *      1 işletme →   13 sorgu →  ~3 sn
 *     10 işletme →  130 sorgu →  ~4,5 sn
 *     56 işletme →  728 sorgu →  BAĞLANTI HAVUZU TÜKENİYOR
 *
 * Son satır teorik değil: `/admin/kiyaslama` sayfası platform yöneticisine
 * (tüm işletmeler) açıldığında havuz (5 bağlantı) doluyor ve sayfa
 * "timeout exceeded when trying to connect" ile düşüyordu. Yani özellik
 * yavaş değil, ÇALIŞMIYORDU — ve yavaşlık gibi göründüğü için de kimse
 * hata olarak bakmamıştı.
 *
 * Çözüm mimari: her ölçü artık TEK sorguda, `groupBy` ile tüm işletmeler
 * için birlikte hesaplanıyor; sonuçlar bellekte işletmeye dağıtılıyor.
 * Toplam sorgu sayısı sabit (12), işletme sayısı ne olursa olsun.
 *
 * Bellek maliyeti bilinçli: satır çeken üç sorgu (kategori, trend, çözüm
 * süresi) artık tüm işletmelerin satırlarını birlikte getiriyor. Hepsi
 * zaten tarih penceresiyle sınırlı ve yalnızca gereken sütunları seçiyor;
 * 56 işletme için bu, 56 ayrı gidiş dönüşten kat kat ucuz.
 */
export async function getBusinessStats(businessIds: string[]): Promise<BusinessStats[]> {
  if (businessIds.length === 0) return [];

  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    orderBy: { createdAt: "asc" },
  });
  if (businesses.length === 0) return [];

  const idler = businesses.map((b) => b.id);
  const kapsam = { businessId: { in: idler } };
  const trendFrom = weekStart(daysAgo(TREND_WEEKS * 7));

  const [
    genelSatirlar,
    son7Satirlar,
    son30Satirlar,
    onceki30Satirlar,
    acikSikayetSatirlar,
    googleGosterilenSatirlar,
    googleTiklananSatirlar,
    kategoriSatirlar,
    trendSatirlar,
    goruntulemeSatirlar,
    ilkGoruntulemeSatirlar,
    cozulenSatirlar,
  ] = await Promise.all([
    // Toplam + ortalama: tek groupBy, tüm işletmeler.
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: kapsam,
      _avg: { overallRating: true },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { ...kapsam, createdAt: { gte: daysAgo(7) } },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { ...kapsam, createdAt: { gte: daysAgo(30) } },
      _avg: { overallRating: true },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { ...kapsam, createdAt: { gte: daysAgo(60), lt: daysAgo(30) } },
      _avg: { overallRating: true },
      _count: { _all: true },
    }),
    // Açık şikayetin eşiği İŞLETMEYE GÖRE değişiyor (notifyThreshold), o
    // yüzden tek bir `lte` ile filtrelenemiyor. Puana göre kırılım tek
    // sorguda alınıyor, eşik karşılaştırması bellekte yapılıyor.
    prisma.feedback.groupBy({
      by: ["businessId", "overallRating"],
      where: { ...kapsam, status: { not: "cozuldu" } },
      _count: { _all: true },
    }),
    // Google'a yönlenen ve tıklayan AYRI sorgular: ikisi aynı satırlar
    // üzerinde farklı yüklemler ve tek bir groupBy ile ifade edilemiyorlar
    // (bir satır hem "yönlendirildi" hem "tıklanmadı" olabiliyor). İkisi de
    // işletme sayısından bağımsız, toplam iki sorgu.
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { ...kapsam, redirectedToGoogle: true },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { ...kapsam, googleClickedAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.feedback.findMany({
      where: {
        ...kapsam,
        categoryRatings: { not: null },
        createdAt: { gte: daysAgo(CATEGORY_WINDOW_DAYS) },
      },
      select: { businessId: true, categoryRatings: true, problemDetails: true },
    }),
    prisma.feedback.findMany({
      where: { ...kapsam, createdAt: { gte: trendFrom } },
      select: { businessId: true, overallRating: true, createdAt: true },
    }),
    prisma.surveyView.groupBy({
      by: ["businessId"],
      where: kapsam,
      _count: { _all: true },
    }),
    // Ölçümün başladığı an — işletme başına en eski görüntüleme.
    prisma.surveyView.groupBy({
      by: ["businessId"],
      where: kapsam,
      _min: { createdAt: true },
    }),
    prisma.feedback.findMany({
      where: { ...kapsam, resolvedAt: { not: null } },
      select: { businessId: true, createdAt: true, resolvedAt: true },
    }),
  ]);

  // --- Sorgu sonuçlarını işletmeye göre indekslemek ------------------------
  const ilkGoruntuleme = new Map(
    ilkGoruntulemeSatirlar.map((g) => [g.businessId, g._min.createdAt]),
  );

  /**
   * Tamamlama oranının paydası işletmeye göre farklı bir tarihten başlıyor
   * (o işletmenin ilk görüntülemesi), bu yüzden tek bir `where` ile
   * ifade edilemiyor. Her işletme için ayrı sorgu atmak yerine koşullar
   * TEK sorguda OR'lanıyor: 56 işletme için 56 dallı bir OR, 56 gidiş
   * dönüşten kıyaslanamayacak kadar ucuz.
   */
  const olcumKosullari = businesses
    .map((b) => ({ businessId: b.id, baslangic: ilkGoruntuleme.get(b.id) ?? null }))
    .filter((x): x is { businessId: string; baslangic: Date } => x.baslangic !== null)
    .map((x) => ({ businessId: x.businessId, createdAt: { gte: x.baslangic } }));

  const olcumSonrasiSatirlar = olcumKosullari.length
    ? await prisma.feedback.groupBy({
        by: ["businessId"],
        where: { OR: olcumKosullari },
        _count: { _all: true },
      })
    : [];

  const genel = new Map(genelSatirlar.map((g) => [g.businessId, g]));
  const son7 = new Map(son7Satirlar.map((g) => [g.businessId, g._count._all]));
  const son30 = new Map(son30Satirlar.map((g) => [g.businessId, g]));
  const onceki30 = new Map(onceki30Satirlar.map((g) => [g.businessId, g]));
  const goruntuleme = new Map(goruntulemeSatirlar.map((g) => [g.businessId, g._count._all]));
  const olcumSonrasi = new Map(olcumSonrasiSatirlar.map((g) => [g.businessId, g._count._all]));

  // Açık şikayet: eşik karşılaştırması burada, çünkü eşik işletmeye özel.
  const esikHarita = new Map(businesses.map((b) => [b.id, b.notifyThreshold]));
  const esikAltiSayac = new Map<string, number>();
  for (const satir of acikSikayetSatirlar) {
    const esik = esikHarita.get(satir.businessId);
    if (esik === undefined || satir.overallRating > esik) continue;
    esikAltiSayac.set(
      satir.businessId,
      (esikAltiSayac.get(satir.businessId) ?? 0) + satir._count._all,
    );
  }

  const googleGosterilen = new Map(
    googleGosterilenSatirlar.map((g) => [g.businessId, g._count._all]),
  );
  const googleTiklanan = new Map(
    googleTiklananSatirlar.map((g) => [g.businessId, g._count._all]),
  );

  const grupla = <T extends { businessId: string }>(satirlar: T[]) => {
    const harita = new Map<string, T[]>();
    for (const satir of satirlar) {
      const liste = harita.get(satir.businessId);
      if (liste) liste.push(satir);
      else harita.set(satir.businessId, [satir]);
    }
    return harita;
  };

  const kategoriHarita = grupla(kategoriSatirlar);
  const trendHarita = grupla(trendSatirlar);
  const cozulenHarita = grupla(cozulenSatirlar);

  const ortalama = (satir: { _avg: { overallRating: number | null } } | undefined) =>
    satir && satir._avg.overallRating !== null ? round(satir._avg.overallRating, 2) : null;

  return businesses.map((business) => {
    const overallSatir = genel.get(business.id);
    const overall = {
      count: overallSatir?._count._all ?? 0,
      average: ortalama(overallSatir),
    };
    const last30Average = ortalama(son30.get(business.id));
    const prev30Average = ortalama(onceki30.get(business.id));

    const delta =
      last30Average !== null && prev30Average !== null
        ? round(last30Average - prev30Average, 2)
        : null;

    const categoryRows = kategoriHarita.get(business.id) ?? [];
    const trendRows = trendHarita.get(business.id) ?? [];
    const resolvedRows = cozulenHarita.get(business.id) ?? [];

    // --- Kategori ortalamaları
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of categoryRows) {
      let parsed: Record<string, number>;
      try {
        parsed = JSON.parse(row.categoryRatings ?? "{}") as Record<string, number>;
      } catch {
        continue;
      }
      for (const [name, value] of Object.entries(parsed)) {
        const bucket = buckets.get(name) ?? { sum: 0, count: 0 };
        bucket.sum += value;
        bucket.count += 1;
        buckets.set(name, bucket);
      }
    }
    const weakCategories = [...buckets.entries()]
      .map(([name, bucket]) => ({
        name,
        average: round(bucket.sum / bucket.count),
        count: bucket.count,
      }))
      .sort((a, b) => a.average - b.average);

    // --- En çok işaretlenen sorun alanları
    const sorunSayaci = new Map<string, { kategori: string; alan: string; count: number }>();
    for (const row of categoryRows) {
      for (const [kategori, alanlar] of Object.entries(detaylariCoz(row.problemDetails))) {
        for (const alan of alanlar) {
          const anahtar = `${kategori}\u0000${alan}`;
          const mevcut = sorunSayaci.get(anahtar) ?? { kategori, alan, count: 0 };
          mevcut.count += 1;
          sorunSayaci.set(anahtar, mevcut);
        }
      }
    }
    // Tek kez işaretlenen alan örüntü değil, gürültü: "en çok şikayet
    // edilen" başlığı altında "1 kez" görmek patronu yanlış yere yönlendirir.
    // En az iki kez tekrar edenler listeye giriyor.
    const topProblems = [...sorunSayaci.values()]
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.count - a.count || a.kategori.localeCompare(b.kategori, "tr"))
      .slice(0, 5);

    // --- Haftalık trend
    const weekBuckets = new Map<number, { sum: number; count: number }>();
    for (const row of trendRows) {
      const key = weekStart(row.createdAt).getTime();
      const bucket = weekBuckets.get(key) ?? { sum: 0, count: 0 };
      bucket.sum += row.overallRating;
      bucket.count += 1;
      weekBuckets.set(key, bucket);
    }

    const trend: TrendPoint[] = [];
    for (let i = TREND_WEEKS - 1; i >= 0; i -= 1) {
      const start = new Date(trendFrom.getTime() + (TREND_WEEKS - 1 - i) * 7 * DAY);
      const bucket = weekBuckets.get(start.getTime());
      trend.push({
        start,
        label: start.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
        count: bucket?.count ?? 0,
        average: bucket ? round(bucket.sum / bucket.count, 2) : null,
      });
    }

    const views = goruntuleme.get(business.id) ?? 0;
    // Tamamlama oranı yalnızca ölçüm başladıktan sonraki verilerle anlamlı:
    // eski kayıtlar sayıya girerse oran %100'ün çok üstüne çıkar.
    const feedbacksSinceTracking = olcumSonrasi.get(business.id) ?? 0;

    const completionRate =
      views > 0 ? Math.min(100, Math.round((feedbacksSinceTracking / views) * 100)) : null;

    const resolutionHours = resolvedRows
      .map((row) =>
        row.resolvedAt
          ? (row.resolvedAt.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000)
          : null,
      )
      .filter((value): value is number => value !== null && value >= 0);

    const avgResolutionHours = resolutionHours.length
      ? round(
          resolutionHours.reduce((acc, value) => acc + value, 0) / resolutionHours.length,
        )
      : null;

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      brandColor: business.brandColor,
      notifyThreshold: business.notifyThreshold,
      total: overall.count,
      average: overall.average,
      openComplaints: esikAltiSayac.get(business.id) ?? 0,
      last7Days: son7.get(business.id) ?? 0,
      last30Average,
      prev30Average,
      delta,
      googleShown: googleGosterilen.get(business.id) ?? 0,
      googleClicked: googleTiklanan.get(business.id) ?? 0,
      weakCategories,
      topProblems,
      trend,
      views,
      feedbacksSinceTracking,
      completionRate,
      avgResolutionHours,
    };
  });
}

/**
 * Dönem içindeki ham ürün puanları.
 *
 * Toplama işi menu.ts'teki saf fonksiyonlarda yapılıyor; burası yalnızca
 * veriyi çekiyor. Böylece "en iyi/en kötü" kuralları veritabanı olmadan
 * testlenebiliyor.
 */
export async function getItemRatings(businessIds: string[], days = 30) {
  if (businessIds.length === 0) return [];
  return prisma.itemRating.findMany({
    where: { businessId: { in: businessIds }, createdAt: { gte: daysAgo(days) } },
    select: { menuItemId: true, itemName: true, rating: true },
  });
}
