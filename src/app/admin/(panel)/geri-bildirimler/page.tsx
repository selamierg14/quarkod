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
  formatDateTime,
  buttonClass,
} from "@/components/ui";
import { RaporSekmeleri } from "@/components/RaporSekmeleri";
import { buildFeedbackWhere, type FeedbackQuery } from "@/lib/isletme/feedback-filters";
import { FilterBar } from "./FilterBar";
import { masaEtiketi } from "@/lib/isletme/masa";
import { puanMetinRengi } from "../OzetParcalari";

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
    <div className="flex flex-col gap-6">
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
        // Gelen kutusu: tablo değil satır listesi (yeni panel tasarımı).
        // Puan büyük ve renginde — göz önce onu okuyor; kırmızı yalnızca
        // düşük puanda. Satırın tamamı kayda gidiyor.
        <ul className="m-0 list-none overflow-hidden rounded-card bg-surface p-0 shadow-card ring-1 ring-line">
          {feedbacks.map((feedback) => {
            const ratings: Record<string, number> = feedback.categoryRatings
              ? JSON.parse(feedback.categoryRatings)
              : {};
            const weak = Object.entries(ratings)
              .filter(([, value]) => value <= 3)
              .sort((a, b) => a[1] - b[1])
              .slice(0, 2);
            return (
              <li key={feedback.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/admin/geri-bildirimler/${feedback.id}`}
                  className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-sunken sm:grid-cols-[48px_minmax(0,1fr)_auto]"
                >
                  <span
                    className={`row-span-2 font-display text-[32px] leading-none font-bold tracking-[-0.03em] sm:row-span-1 ${puanMetinRengi(feedback.overallRating)}`}
                    aria-label={`${feedback.overallRating} / 5 puan`}
                  >
                    {feedback.overallRating}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="font-semibold text-ink">
                        {feedback.table ? masaEtiketi(feedback.table) : "Masa —"}
                      </span>
                      <span className="font-mono text-caption text-ink-faint">
                        {formatDateTime(feedback.createdAt)}
                      </span>
                      {businesses.length > 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-caption text-ink-muted">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: feedback.business.brandColor }}
                          />
                          {feedback.business.name}
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-1 text-ink-soft">
                      {feedback.comment || <span className="text-ink-faint">Yorum bırakılmadı.</span>}
                    </span>
                    {weak.length > 0 ? (
                      <span className="font-mono text-caption text-danger">
                        {weak.map(([name, value]) => `${name.toLocaleLowerCase("tr")} ${value}`).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="col-start-2 sm:col-start-auto sm:self-start">
                    <StatusBadge status={feedback.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
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
