import type { Metadata } from "next";
import { SurveyForm } from "@/components/SurveyForm";
import { ViewTracker } from "@/components/ViewTracker";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { isletmeSlugla, menuIcerigi, qrSayfaVerisi } from "@/lib/qr-sayfa";
import { sorunSecenekleri } from "@/lib/anket-detay";

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
    title: business ? `${business.name} — Görüşünüz` : "Geri bildirim",
    robots: { index: false },
  };
}

export default async function AnketPage({ params }: { params: Promise<Params> }) {
  const { slug, table: tableParam } = await params;
  const { business, table, menuAcik } = await qrSayfaVerisi(slug, tableParam);

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
    <MusteriKabuk
      business={business}
      masaNo={table.tableNumber}
      girisMi={table.isEntrance}
      altBaslik="karsilama.anketAciklama"
      kompakt
    >
      <ViewTracker slug={business.slug} tableNumber={table.tableNumber} />

      <SurveyForm
        slug={business.slug}
        businessName={business.name}
        brandColor={business.brandColor}
        logoUrl={business.logoUrl}
        tableNumber={table.tableNumber}
        girisMi={table.isEntrance}
        categories={business.categories.map((c) => ({
          id: c.id,
          name: c.name,
          // Seçenekler sunucuda hesaplanıyor: işletme kendi listesini
          // yazmadıysa kategori adına göre makul bir varsayılan geliyor.
          sorunAlanlari: sorunSecenekleri(c.name, c.problemOptions),
        }))}
        menuItems={urunler}
      />
    </MusteriKabuk>
  );
}
