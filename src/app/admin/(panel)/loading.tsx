import { Skeleton, SkeletonRows } from "@/components/ui";

/**
 * Panel sayfaları arası geçişte iskelet.
 *
 * Sayfalar force-dynamic ve veritabanına gidiyor; gösterge olmadan tıklama
 * ile içeriğin gelmesi arasında ekran donmuş gibi görünüyordu.
 *
 * İskelet BÜTÜN panel sayfalarının ortak şeklini taklit ediyor: zeminde
 * duran başlık (ikon + başlık + açıklama satırı) ve altında bir liste
 * kartı. Önceden dört özet kutusu da çiziliyordu — yani her geçişte Özet
 * ekranının iskeleti görünüyor, ardından bambaşka bir sayfa (Hesaplar,
 * Kullanıcılar) açılıyordu. UI incelemesi bunu "yanıltıcı yükleme, yerleşim
 * kayması" olarak yakaladı. Ortak paydada kalan iskelet hiçbir sayfa için
 * yanlış bir vaat vermiyor.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor…</span>

      {/* Başlık: PageHeader artık kart değil, doğrudan zeminde. */}
      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-control" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-full max-w-52" />
          <Skeleton className="mt-2 h-3.5 w-full max-w-96" />
        </div>
      </div>

      <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
        <div className="border-b border-line px-5 py-3.5">
          <Skeleton className="h-3.5 w-40" />
        </div>
        <SkeletonRows satir={6} />
      </div>
    </div>
  );
}
