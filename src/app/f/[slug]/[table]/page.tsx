import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { isletmeSlugla, qrSayfaVerisi } from "@/lib/qr-sayfa";
import { duyuruAktifMi } from "@/lib/duyuru";
import { KarsilamaSecenekleri } from "./KarsilamaSecenekleri";

type Params = { slug: string; table: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  // isletmeSlugla `cache()` ile sarılı: sayfanın kendisi de aynı istek
  // içinde aynı sorguyu (qrSayfaVerisi üzerinden) çağırıyor, burada ikinci
  // bir sorgu atılmıyor.
  const business = await isletmeSlugla(slug);
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
  const { business, table, menuAcik } = await qrSayfaVerisi(slug, tableParam);

  const taban = `/f/${business.slug}/${encodeURIComponent(table.tableNumber)}`;

  if (!menuAcik) redirect(`${taban}/anket`);

  // Bu iki sorgu birbirinden bağımsız; sırayla beklemek her QR taramasına
  // (sitenin en yüksek trafikli isteği) bir tur gecikme ekliyordu.
  const [urunVar, tumDuyurular] = await Promise.all([
    // Menü modülü açık ama menü hâlâ boşsa da anket tek seçenek.
    prisma.menuItem.count({
      where: { businessId: business.id, active: true, category: { active: true } },
    }),
    // Tıklanması gereken kart sadece gerçekten aktif bir duyuru varsa
    // çıksın — boş bir "Duyurular" sayfasına yönlendirmenin anlamı yok.
    prisma.duyuru.findMany({
      where: { businessId: business.id, aktif: true },
      orderBy: { sortOrder: "desc" },
    }),
  ]);
  if (urunVar === 0) redirect(`${taban}/anket`);

  const aktifDuyurular = tumDuyurular.filter((d) => duyuruAktifMi(d));

  return (
    <MusteriKabuk
      business={business}
      masaNo={table.tableNumber}
      girisMi={table.isEntrance}
      altBaslik="ortak.hosGeldiniz"
    >
      <KarsilamaSecenekleri
        taban={taban}
        siparis={{
          yemeksepetiUrl: business.yemeksepetiUrl,
          getirUrl: business.getirUrl,
          trendyolUrl: business.trendyolUrl,
          migrosUrl: business.migrosUrl,
        }}
        duyuru={
          aktifDuyurular.length > 0
            ? { baslik: aktifDuyurular[0].baslik, adet: aktifDuyurular.length }
            : null
        }
      />
    </MusteriKabuk>
  );
}
