import { Skeleton, SkeletonRows } from "@/components/ui";

/**
 * Panel sayfaları arası geçişte iskelet.
 *
 * Sayfalar force-dynamic ve veritabanına gidiyor; gösterge olmadan tıklama
 * ile içeriğin gelmesi arasında ekran donmuş gibi görünüyordu.
 *
 * İskelet, gelecek sayfanın şeklini taklit ediyor: üstte başlık kartı
 * (PageHeader artık kendi yüzeyi olan bir kart), altında dört özet kutusu
 * ve bir liste. Boyutlar gerçek yerleşimle aynı olduğu için içerik gelince
 * ekran zıplamıyor — dönen bir çarkın veremediği şey bu.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor…</span>

      {/* Başlık kartı: rozet + başlık + açıklama satırı. */}
      <div className="flex items-start gap-3 rounded-card bg-surface px-5 py-4 shadow-card ring-1 ring-line">
        <Skeleton className="h-10 w-10 shrink-0 rounded-control" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-full max-w-44" />
          <Skeleton className="mt-2 h-3 w-full max-w-72" />
        </div>
      </div>

      {/* Özet kutuları — dar ekranda tek sütuna iniyor, tıpkı gerçeğinde. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
          >
            <Skeleton className="h-1 w-full rounded-none ring-0" />
            <div className="p-4">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-2 h-2.5 w-full max-w-32" />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
        <div className="border-b border-line px-5 py-3.5">
          <Skeleton className="h-3.5 w-40" />
        </div>
        <SkeletonRows satir={5} />
      </div>
    </div>
  );
}
