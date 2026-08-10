import "server-only";
import { prisma } from "./db";
import { SHIFTS, type Shift } from "./constants";

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

async function averageBetween(
  businessId: string,
  from: Date,
  to?: Date,
): Promise<{ count: number; average: number | null }> {
  const result = await prisma.feedback.aggregate({
    where: { businessId, createdAt: to ? { gte: from, lt: to } : { gte: from } },
    _avg: { overallRating: true },
    _count: { _all: true },
  });
  return {
    count: result._count._all,
    average: result._avg.overallRating !== null ? round(result._avg.overallRating, 2) : null,
  };
}

/**
 * Vardiyaya göre kırılım. Vardiya etiketi her kayda otomatik yazılıyor;
 * "gece vardiyasında puan düşüyor" gibi bir bulgu doğrudan personel kararına
 * dönüştüğü için ayrı bir görünüm hak ediyor.
 */
export async function getShiftBreakdown(
  businessIds: string[],
  days = 30,
): Promise<ShiftBreakdown[]> {
  const grouped = await prisma.feedback.groupBy({
    by: ["shift"],
    where: {
      businessId: { in: businessIds },
      createdAt: { gte: daysAgo(days) },
      shift: { not: null },
    },
    _avg: { overallRating: true },
    _count: { _all: true },
  });

  const map = new Map(grouped.map((row) => [row.shift, row]));

  return (Object.keys(SHIFTS) as Shift[]).map((shift) => {
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
export async function getBusinessStats(businessIds: string[]): Promise<BusinessStats[]> {
  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    orderBy: { createdAt: "asc" },
  });

  const trendFrom = weekStart(daysAgo(TREND_WEEKS * 7));

  return Promise.all(
    businesses.map(async (business) => {
      const [
        overall,
        last7,
        last30,
        prev30,
        openComplaints,
        googleShown,
        googleClicked,
        categoryRows,
        trendRows,
        views,
        firstView,
        resolvedRows,
      ] = await Promise.all([
        // Toplam ve ortalama veritabanında hesaplanır; satırlar belleğe çekilmez.
        averageBetween(business.id, new Date(0)),
        prisma.feedback.count({
          where: { businessId: business.id, createdAt: { gte: daysAgo(7) } },
        }),
        averageBetween(business.id, daysAgo(30)),
        averageBetween(business.id, daysAgo(60), daysAgo(30)),
        // Açık şikayet, işletmenin kendi bildirim eşiğini kullanır.
        prisma.feedback.count({
          where: {
            businessId: business.id,
            status: { not: "cozuldu" },
            overallRating: { lte: business.notifyThreshold },
          },
        }),
        prisma.feedback.count({
          where: { businessId: business.id, redirectedToGoogle: true },
        }),
        prisma.feedback.count({
          where: { businessId: business.id, googleClickedAt: { not: null } },
        }),
        // Kategori kırılımı JSON'da olduğu için satır gerekiyor; yalnızca o
        // sütunu ve yalnızca son 90 günü çekiyoruz.
        prisma.feedback.findMany({
          where: {
            businessId: business.id,
            categoryRatings: { not: null },
            createdAt: { gte: daysAgo(CATEGORY_WINDOW_DAYS) },
          },
          select: { categoryRatings: true },
        }),
        prisma.feedback.findMany({
          where: { businessId: business.id, createdAt: { gte: trendFrom } },
          select: { overallRating: true, createdAt: true },
        }),
        prisma.surveyView.count({ where: { businessId: business.id } }),
        // Ölçümün başladığı an: bundan önceki geri bildirimlerin görüntüleme
        // karşılığı yok, oranı onlarla hesaplamak saçma sonuç verir.
        prisma.surveyView.findFirst({
          where: { businessId: business.id },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        // Çözüm süresi: yalnızca gerçekten çözülmüş kayıtlar.
        prisma.feedback.findMany({
          where: { businessId: business.id, resolvedAt: { not: null } },
          select: { createdAt: true, resolvedAt: true },
        }),
      ]);

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

      const delta =
        last30.average !== null && prev30.average !== null
          ? round(last30.average - prev30.average, 2)
          : null;

      // Tamamlama oranı yalnızca ölçüm başladıktan sonraki verilerle anlamlı:
      // eski kayıtlar sayıya girerse oran %100'ün çok üstüne çıkar.
      const feedbacksSinceTracking = firstView
        ? await prisma.feedback.count({
            where: { businessId: business.id, createdAt: { gte: firstView.createdAt } },
          })
        : 0;

      const completionRate =
        views > 0
          ? Math.min(100, Math.round((feedbacksSinceTracking / views) * 100))
          : null;

      const resolutionHours = resolvedRows
        .map((row) =>
          row.resolvedAt
            ? (row.resolvedAt.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000)
            : null,
        )
        .filter((value): value is number => value !== null && value >= 0);

      const avgResolutionHours = resolutionHours.length
        ? round(
            resolutionHours.reduce((acc, value) => acc + value, 0) /
              resolutionHours.length,
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
        openComplaints,
        last7Days: last7,
        last30Average: last30.average,
        prev30Average: prev30.average,
        delta,
        googleShown,
        googleClicked,
        weakCategories,
        trend,
        views,
        feedbacksSinceTracking,
        completionRate,
        avgResolutionHours,
      };
    }),
  );
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
