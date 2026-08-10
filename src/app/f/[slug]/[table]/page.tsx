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
      <div className="flex flex-col gap-3">
        <Link
          href={`${taban}/menu`}
          className="group flex items-center gap-4 rounded-2xl bg-white/95 p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: business.brandColor }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h16M4 19h10" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-slate-900">Menüyü görüntüle</span>
            <span className="block text-sm text-slate-500">
              Fotoğraflı menü, fiyatlar ve günün durumu
            </span>
          </span>
        </Link>

        <Link
          href={`${taban}/anket`}
          className="group flex items-center gap-4 rounded-2xl bg-white/95 p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-slate-900">
              Deneyiminizi değerlendirin
            </span>
            <span className="block text-sm text-slate-500">30 saniyenizi alır</span>
          </span>
        </Link>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Görüşleriniz doğrudan işletme sahibine ulaşır.
      </p>
    </MusteriKabuk>
  );
}
