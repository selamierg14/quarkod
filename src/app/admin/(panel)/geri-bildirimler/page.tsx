import Link from "next/link";
import { requireTenant, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, StatusBadge, Stars, formatDateTime } from "@/components/ui";
import { buildFeedbackWhere, type FeedbackQuery } from "@/lib/feedback-filters";
import { FilterBar } from "./FilterBar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Geri bildirimler" };

const PAGE_SIZE = 30;

export default async function FeedbackListPage({
  searchParams,
}: {
  searchParams: Promise<FeedbackQuery>;
}) {
  const user = await requireTenant();
  const businesses = await visibleBusinesses(user);
  const allowedIds = businesses.map((b) => b.id);
  const query = await searchParams;

  // Yetki filtresi burada uygulanır: sorumlu, adres çubuğuna başka bir işletme
  // kimliği yazarak kapsam dışına çıkamaz.
  const where = buildFeedbackWhere(query, allowedIds);

  const page = Math.max(1, Number(query.sayfa ?? 1) || 1);

  const [total, feedbacks] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { business: true, table: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const next = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v) as [string, string][],
    );
    next.set("sayfa", String(target));
    return `/admin/geri-bildirimler?${next.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-title font-semibold">Geri bildirimler</h1>
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
        showBusinessFilter={user.role === "owner"}
      />

      {feedbacks.length === 0 ? (
        <EmptyState>Bu filtrelere uyan kayıt yok.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-control bg-surface ring-1 ring-line">
          <table className="w-full min-w-[720px] text-small">
            <thead className="border-b border-line text-left text-caption tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">İşletme</th>
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: feedback.business.brandColor }}
                        />
                        {feedback.business.name}
                      </span>
                    </td>
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

      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2 text-small">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-chip border border-line px-3 py-1.5 hover:bg-surface"
            >
              ← Önceki
            </Link>
          ) : null}
          <span className="text-ink-muted">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-chip border border-line px-3 py-1.5 hover:bg-surface"
            >
              Sonraki →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
