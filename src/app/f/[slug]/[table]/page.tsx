import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { qrSayfaVerisi } from "@/lib/qr-sayfa";

type Params = { slug: string; table: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug } });
  return {
    title: business ? `${business.name}` : "Hoş geldiniz",
    robots: { index: false },
  };
}

/**
 * QR okutulduğunda açılan ilk ekran.
 *
 * Menü modülü kapalıysa burada oyalanmanın anlamı yok: doğrudan ankete
 * gidilir. Fazladan bir tık, tamamlanma oranını düşüren en ucuz hatadır.
 */
export default async function KarsilamaPage({ params }: { params: Promise<Params> }) {
  const { slug, table: tableParam } = await params;
  const { business, table, tableLabel, menuAcik } = await qrSayfaVerisi(slug, tableParam);

  const taban = `/f/${business.slug}/${encodeURIComponent(table.tableNumber)}`;

  if (!menuAcik) redirect(`${taban}/anket`);

  // Menü modülü açık ama menü hâlâ boşsa da anket tek seçenek.
  const urunVar = await prisma.menuItem.count({
    where: { businessId: business.id, active: true, category: { active: true } },
  });
  if (urunVar === 0) redirect(`${taban}/anket`);

  return (
    <MusteriKabuk business={business} tableLabel={tableLabel} altBaslik="Hoş geldiniz">
      <div className="flex flex-col gap-3.5">
        <Link
          href={`${taban}/menu`}
          className="group flex items-center gap-4 rounded-card bg-surface p-5 text-left shadow-card ring-1 ring-line transition active:scale-[0.99] active:shadow-none"
        >
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h16M4 19h10" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-ink">Menüyü görüntüle</span>
            <span className="block text-small text-ink-muted">
              Fotoğraflı menü, fiyatlar ve günün durumu
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-ink-faint transition group-active:translate-x-0.5"
          >
            →
          </span>
        </Link>

        <Link
          href={`${taban}/anket`}
          className="group flex items-center gap-4 rounded-card bg-surface p-5 text-left shadow-card ring-1 ring-line transition active:scale-[0.99] active:shadow-none"
        >
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-rating"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-ink">
              Deneyiminizi değerlendirin
            </span>
            <span className="block text-small text-ink-muted">30 saniyenizi alır</span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-ink-faint transition group-active:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>

      <p className="mt-6 text-center text-caption text-ink-faint">
        Görüşleriniz doğrudan işletme sahibine ulaşır.
      </p>
    </MusteriKabuk>
  );
}
