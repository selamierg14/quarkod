import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { requireAnketErisim, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import { EmptyState, Pagination, StatusBadge, Stars, formatDateTime } from "@/components/ui";
import { RaporSekmeleri } from "@/components/RaporSekmeleri";
import { buildFeedbackWhere, type FeedbackQuery } from "@/lib/isletme/feedback-filters";
import { FilterBar } from "./FilterBar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Geri bildirimler" };


export default async function FeedbackListPage({
  searchParams,
}: {
  searchParams: Promise<FeedbackQuery>;
}) {
  const user = await requireAnketErisim();
  const businesses = await visibleBusinesses(user);
  const allowedIds = businesses.map((b) => b.id);
  const query = await searchParams;

  // Yetki filtresi burada uygulanır: sorumlu, adres çubuğuna başka bir işletme
  // kimliği yazarak kapsam dışına çıkamaz.
  const where = buildFeedbackWhere(query, allowedIds);

  const total = await prisma.feedback.count({ where });
  // Sayfa boyutu kullanıcının (varsayılan 10); eskiden 30'a sabitti.
  const durum = sayfaDurumu(query, total);

  const feedbacks = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: durum.skip,
    take: durum.take,
    include: { business: true, table: true },
  });

  const pageCount = toplamSayfa(total, durum.boyut);

  function pageHref(target: number) {
    const next = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v) as [string, string][],
    );
    next.set("sayfa", String(target));
    // Boyut seçimi sayfa değişince korunuyor.
    if (durum.boyut !== 10) next.set("boyut", String(durum.boyut));
    return `/admin/geri-bildirimler?${next.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <RaporSekmeleri aktif="liste" />

      <div className="flex items-baseline justify-between">
        <h1 className="flex items-center gap-2.5 text-title font-semibold">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-control bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/25"
          >
            <MessageSquare className="h-4 w-4" />
          </span>
          Geri bildirimler
        </h1>
        <span className="flex items-center gap-3">
          <span className="text-small text-ink-muted">{total} kayıt</span>
          {total > 0 ? (
            <a
              href={`/admin/geri-bildirimler/disa-aktar?${new URLSearchParams(
                Object.entries(query).filter(
                  ([key, value]) => value && key !== "sayfa",
                ) as [string, string][],
              ).toString()}`}
              className="print-hidden rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink-soft hover:bg-canvas"
            >
              CSV indir
            </a>
          ) : null}
        </span>
      </div>

      <FilterBar
        businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        showBusinessFilter={businesses.length > 1}
      />

      {feedbacks.length === 0 ? (
        <EmptyState>Bu filtrelere uyan kayıt yok.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-control bg-surface ring-1 ring-line">
          <table className="w-full min-w-[720px] text-small">
            <thead className="border-b border-line text-left text-caption tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih</th>
                {businesses.length > 1 ? (
                  <th className="px-4 py-3 font-medium">İşletme</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Masa</th>
                <th className="px-4 py-3 font-medium">Puan</th>
                <th className="px-4 py-3 font-medium">Zayıf kategoriler</th>
                <th className="px-4 py-3 font-medium">Yorum</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {feedbacks.map((feedback) => {
                const ratings: Record<string, number> = feedback.categoryRatings
                  ? JSON.parse(feedback.categoryRatings)
                  : {};
                const weak = Object.entries(ratings)
                  .filter(([, value]) => value <= 3)
                  .sort((a, b) => a[1] - b[1])
                  .slice(0, 2);

                return (
                  <tr key={feedback.id} className="hover:bg-canvas">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                      <Link
                        href={`/admin/geri-bildirimler/${feedback.id}`}
                        className="hover:underline"
                      >
                        {formatDateTime(feedback.createdAt)}
                      </Link>
                    </td>
                    {businesses.length > 1 ? (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: feedback.business.brandColor }}
                          />
                          {feedback.business.name}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                      {feedback.table
                        ? feedback.table.isEntrance
                          ? "Giriş"
                          : feedback.table.tableNumber
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Stars value={feedback.overallRating} />
                    </td>
                    <td className="px-4 py-3">
                      {weak.length === 0 ? (
                        <span className="text-rating-empty">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {weak.map(([name, value]) => (
                            <span
                              key={name}
                              className="rounded-md bg-danger-soft px-1.5 py-0.5 text-caption text-danger-ink"
                            >
                              {name} {value}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        href={`/admin/geri-bildirimler/${feedback.id}`}
                        className="line-clamp-2 text-ink-soft hover:text-ink"
                      >
                        {feedback.comment ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={feedback.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Elle yazılmış önceki/sonraki bloğu ortak bileşene alındı:
          sayfa boyutu seçici de onunla birlikte geliyor ve panelin
          tamamında aynı çubuk duruyor. */}
      {cubukGosterilsinMi(total, durum.boyut) ? (
        <Pagination
          sayfa={durum.sayfa}
          toplamSayfa={pageCount}
          toplamKayit={total}
          boyut={durum.boyut}
          aralik={aralikMetni(durum, total)}
          href={pageHref}
        />
      ) : null}
    </div>
  );
}
