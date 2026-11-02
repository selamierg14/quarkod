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

      {/* Başlık ikonsuz ve büyük; altında defter çizgisiyle bir liste. */}
      <div className="min-w-0">
        <Skeleton className="h-8 w-full max-w-64" />
        <Skeleton className="mt-2.5 h-3.5 w-full max-w-96" />
      </div>

      <div className="border-t border-ink">
        <SkeletonRows satir={6} />
      </div>
    </div>
  );
}
