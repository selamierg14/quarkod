import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SurveyForm } from "@/components/SurveyForm";
import { ViewTracker } from "@/components/ViewTracker";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { menuIcerigi, qrSayfaVerisi } from "@/lib/qr-sayfa";

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
    title: business ? `${business.name} — Görüşünüz` : "Geri bildirim",
    robots: { index: false },
  };
}

export default async function AnketPage({ params }: { params: Promise<Params> }) {
  const { slug, table: tableParam } = await params;
  const { business, table, tableLabel, menuAcik } = await qrSayfaVerisi(slug, tableParam);

  // Ürün puanlaması yalnızca menü modülü açıkken ve menüde ürün varken
  // sorulur; boş bir adım göstermek anketi uzatmaktan başka işe yaramaz.
  const menu = menuAcik ? await menuIcerigi(business.id) : [];
  const urunler = menu
    .flatMap((k) =>
      k.items
        // Tükenen ürün bugün yenmedi; puanlama listesinde yer almamalı.
        .filter((u) => !u.soldOut)
        .map((u) => ({ id: u.id, name: u.name, kategori: k.name })),
    )
    .slice(0, 200);

  return (
    <MusteriKabuk business={business} tableLabel={tableLabel} altBaslik="30 saniyenizi alır">
      <ViewTracker slug={business.slug} tableNumber={table.tableNumber} />

      <SurveyForm
        slug={business.slug}
        businessName={business.name}
        brandColor={business.brandColor}
        logoUrl={business.logoUrl}
        tableNumber={table.tableNumber}
        tableLabel={tableLabel}
        categories={business.categories.map((c) => ({ id: c.id, name: c.name }))}
        menuItems={urunler}
      />
    </MusteriKabuk>
  );
}
