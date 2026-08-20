import Link from "next/link";
import { actingAccountId, requireUser, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/ui";
import { NewBusinessForm } from "./NewBusinessForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "İşletmeler" };

export default async function BusinessListPage() {
  const user = await requireUser();
  const businesses = await visibleBusinesses(user);

  // Sahip her zaman ekleyebilir; platform yöneticisi yalnızca bir hesaba
  // "geçtiğinde" ekleyebilir — createBusiness action'ı zaten bunu böyle
  // kabul ediyor, form da aynı kurala uymalı. Aksi hâlde Hesaplar sayfasının
  // verdiği "panel tam olarak o müşterinin gördüğü hale gelir" sözü
  // burada tutmuyordu: sysadmin bir hesabı görüntülerken işletme ekleme
  // formu hiç görünmüyordu.
  const isletmeEklenebilir =
    user.role === "owner" || (await actingAccountId(user)) !== null;

  // İşletme başına üç ayrı sorgu yerine üç toplu sorgu: 10 işletmede
  // 31 sorgudan 4'e iner.
  const ids = businesses.map((b) => b.id);
  const [tableCounts, categoryCounts, feedbackCounts] = await Promise.all([
    prisma.table.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids }, active: true },
      _count: { _all: true },
    }),
    prisma.categoryTemplate.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids }, active: true },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const toMap = (rows: { businessId: string; _count: { _all: number } }[]) =>
    new Map(rows.map((row) => [row.businessId, row._count._all]));

  const tables = toMap(tableCounts);
  const categories = toMap(categoryCounts);
  const feedbacks = toMap(feedbackCounts);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        ikon="🏪"
        renk="rose"
        title="İşletmeler"
        description="Hesabınıza bağlı şubeler; QR kodları, kategoriler ve marka ayarları her birinin kendi sayfasında."
      />

      {businesses.length === 0 ? (
        <EmptyState baslik="Henüz işletme yok" ikon="🏪">
          Aşağıdan ilk işletmenizi açın; anket kategorileri ve QR kodları
          otomatik hazırlanır.
        </EmptyState>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {businesses.map((business) => {
          return (
            <li key={business.id}>
              <Link
                href={`/admin/isletmeler/${business.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-raised"
              >
                {/* Marka rengi şeridi: onlarca şubesi olan zincirde kartlar
                    birbirinden ancak böyle ayrılıyor. */}
                <span
                  aria-hidden="true"
                  className="h-1.5 w-full"
                  style={{ backgroundColor: business.brandColor }}
                />
                <span className="flex flex-1 flex-col p-5">
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip text-base text-white shadow-sm"
                      style={{ backgroundColor: business.brandColor }}
                    >
                      🏪
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {business.name}
                      </span>
                      <span className="block text-small text-ink-muted">
                        {BUSINESS_TYPES[business.type as BusinessType] ?? business.type}
                        {business.address ? ` · ${business.address}` : ""}
                      </span>
                    </span>
                  </span>

                  <span className="mt-4 flex flex-wrap gap-1.5">
                    <span className="rounded-chip bg-indigo-50 px-2 py-1 text-caption font-semibold text-indigo-700">
                      {tables.get(business.id) ?? 0} QR noktası
                    </span>
                    <span className="rounded-chip bg-amber-50 px-2 py-1 text-caption font-semibold text-amber-700">
                      {categories.get(business.id) ?? 0} kategori
                    </span>
                    <span className="rounded-chip bg-sky-50 px-2 py-1 text-caption font-semibold text-sky-700">
                      {feedbacks.get(business.id) ?? 0} geri bildirim
                    </span>
                  </span>

                  {!business.googleReviewUrl ? (
                    <span className="mt-3 flex items-start gap-1.5 rounded-chip bg-warning-soft px-2.5 py-1.5 text-caption text-warning-ink">
                      <span aria-hidden="true">⚠</span>
                      Google yorum linki yok — 5 yıldız yönlendirmesi çalışmaz.
                    </span>
                  ) : null}

                  <span className="mt-4 flex items-center gap-1 text-caption font-medium text-accent-700">
                    Ayarları aç
                    <span
                      aria-hidden="true"
                      className="transition group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {isletmeEklenebilir ? <NewBusinessForm /> : null}
    </div>
  );
}
