import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
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
  const user = await requireUser();
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
        <h1 className="text-lg font-semibold tracking-tight">Geri bildirimler</h1>
        <span className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{total} kayıt</span>
          {total > 0 ? (
            <a
              href={`/admin/geri-bildirimler/disa-aktar?${new URLSearchParams(
                Object.entries(query).filter(
                  ([key, value]) => value && key !== "sayfa",
                ) as [string, string][],
              ).toString()}`}
              className="print-hidden rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
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
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
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
            <tbody className="divide-y divide-slate-100">
              {feedbacks.map((feedback) => {
                const ratings: Record<string, number> = feedback.categoryRatings
                  ? JSON.parse(feedback.categoryRatings)
                  : {};
                const weak = Object.entries(ratings)
                  .filter(([, value]) => value <= 3)
                  .sort((a, b) => a[1] - b[1])
                  .slice(0, 2);

                return (
                  <tr key={feedback.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
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
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
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
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {weak.map(([name, value]) => (
                            <span
                              key={name}
                              className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs text-red-700"
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
                        className="line-clamp-2 text-slate-600 hover:text-slate-900"
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
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-white"
            >
              ← Önceki
            </Link>
          ) : null}
          <span className="text-slate-500">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-white"
            >
              Sonraki →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
