import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { requireAnketErisim, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import {
  Alert,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  Stars,
  formatDateTime,
  buttonClass,
} from "@/components/ui";
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
  const ham = await searchParams;
  // Başlangıç bitişten sonraysa (15.09 → 01.09) sorgu sessizce "0 kayıt"
  // dönüyordu (QA). Kullanıcının kastettiği aralık belli: çevirip
  // uyguluyoruz ve bunu söylüyoruz.
  const tersAralik = Boolean(ham.baslangic && ham.bitis && ham.baslangic > ham.bitis);
  const query = tersAralik ? { ...ham, baslangic: ham.bitis, bitis: ham.baslangic } : ham;

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

      <PageHeader
        ikon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
        renk="sky"
        title="Geri bildirimler"
        action={
        <span className="flex items-center gap-3">
          <span className="text-small text-ink-muted">{total} kayıt</span>
          {total > 0 ? (
            <a
              href={`/admin/geri-bildirimler/disa-aktar?${new URLSearchParams(
                Object.entries(query).filter(
                  ([key, value]) => value && key !== "sayfa",
                ) as [string, string][],
              ).toString()}`}
              className={buttonClass({ variant: "secondary", size: "sm", className: "print-hidden" })}
            >
              CSV indir
            </a>
          ) : null}
        </span>
        }
      />

      {tersAralik ? (
        <Alert tone="uyari" baslik="Tarih aralığı ters seçilmiş">
          Başlangıç bitişten sonraydı; {query.baslangic} – {query.bitis} aralığı gösteriliyor.
        </Alert>
      ) : null}

      <FilterBar
        businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        showBusinessFilter={businesses.length > 1}
      />

      {feedbacks.length === 0 ? (
        <EmptyState>Bu filtrelere uyan kayıt yok.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[720px] text-small">
            <thead className="bg-sunken/70 text-left text-overline font-semibold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Tarih</th>
                {businesses.length > 1 ? (
                  <th className="px-4 py-2 font-medium">İşletme</th>
                ) : null}
                <th className="px-4 py-2 font-medium">Masa</th>
                <th className="px-4 py-2 font-medium">Puan</th>
                <th className="px-4 py-2 font-medium">Zayıf kategoriler</th>
                <th className="px-4 py-2 font-medium">Yorum</th>
                <th className="px-4 py-2 font-medium">Durum</th>
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
                  <tr
                    key={feedback.id}
                    // Satırın tamamı tıklanabilir (QA: üzerine gelince
                    // vurgulanıyor ama yalnızca tarih ve yorum tıklanıyordu).
                    // Tarih bağlantısı `after:` ile satırı kaplıyor; ekran
                    // okuyucuya tek bağlantı kalıyor. Kırmızı şerit yalnızca
                    // düşük puanda — kırmızının tek anlamı bu.
                    className={`relative cursor-pointer transition-colors hover:bg-sunken/60 ${
                      feedback.overallRating <= 2 ? "shadow-[inset_3px_0_0_0_var(--color-danger)]" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">
                      <Link
                        href={`/admin/geri-bildirimler/${feedback.id}`}
                        className="after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-accent-600"
                      >
                        {formatDateTime(feedback.createdAt)}
                      </Link>
                    </td>
                    {businesses.length > 1 ? (
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: feedback.business.brandColor }}
                          />
                          {feedback.business.name}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">
                      {feedback.table
                        ? feedback.table.isEntrance
                          ? "Giriş"
                          : `Masa ${feedback.table.tableNumber}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Stars value={feedback.overallRating} />
                    </td>
                    <td className="px-4 py-2.5">
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
                    <td className="max-w-xs px-4 py-2.5">
                      <span className="line-clamp-2 text-ink-soft">{feedback.comment ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5">
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
