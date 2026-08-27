import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { isletmeSlugla, menuIcerigi, qrSayfaVerisi } from "@/lib/qr-sayfa";
import { MenuGorunumu } from "./MenuGorunumu";

type Params = { slug: string; table: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  // isletmeSlugla cache() ile sarılı: sayfa gövdesi aynı isteğin
  // içinde qrSayfaVerisi üzerinden aynı satırı tekrar sorgulamıyor.
  const business = await isletmeSlugla(slug);
  return {
    title: business ? `${business.name} — Menü` : "Menü",
    robots: { index: false },
  };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ sec?: string }>;
}) {
  const { slug, table: tableParam } = await params;
  const { sec } = await searchParams;
  const { business, table, menuAcik } = await qrSayfaVerisi(slug, tableParam);
  if (!menuAcik) notFound();

  const kategoriler = await menuIcerigi(business.id);
  const dolu = kategoriler.filter((k) => k.items.length > 0);
  if (dolu.length === 0) notFound();

  const secimModu = sec === "1";

  return (
    <MusteriKabuk
      business={business}
      masaNo={table.tableNumber}
      girisMi={table.isEntrance}
      altBaslik={secimModu ? "menu.secimAltBaslik" : "ortak.menu"}
      dar={false}
      kompakt
    >
      <MenuGorunumu
        slug={business.slug}
        tableNumber={table.tableNumber}
        brandColor={business.brandColor}
        secimModu={secimModu}
        duyuru={
          business.announcementActive ? business.announcement?.trim() || null : null
        }
        fiyatTarihi={
          business.menuPriceUpdatedAt
            ? business.menuPriceUpdatedAt.toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : null
        }
        bolumler={dolu.map((k) => ({
          id: k.id,
          name: k.name,
          items: k.items.map((u) => ({
            id: u.id,
            name: u.name,
            description: u.description,
            priceKurus: u.priceKurus,
            imageUrl: u.imageUrl,
            tags: u.tags,
            soldOut: u.soldOut,
          })),
        }))}
      />
    </MusteriKabuk>
  );
}
