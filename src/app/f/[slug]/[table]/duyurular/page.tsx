import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { qrSayfaVerisi } from "@/lib/qr-sayfa";
import { duyuruAktifMi } from "@/lib/duyuru";
import { DuyurularListesi } from "./DuyurularListesi";

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
    title: business ? `${business.name} — Duyurular` : "Duyurular",
    robots: { index: false },
  };
}

export default async function DuyurularPage({ params }: { params: Promise<Params> }) {
  const { slug, table: tableParam } = await params;
  const { business, table } = await qrSayfaVerisi(slug, tableParam);

  const taban = `/f/${business.slug}/${encodeURIComponent(table.tableNumber)}`;

  const tumDuyurular = await prisma.duyuru.findMany({
    where: { businessId: business.id, aktif: true },
    orderBy: { sortOrder: "desc" },
  });
  const aktifDuyurular = tumDuyurular.filter((d) => duyuruAktifMi(d));

  return (
    <MusteriKabuk
      business={business}
      masaNo={table.tableNumber}
      girisMi={table.isEntrance}
      altBaslik="duyurular.baslik"
    >
      <DuyurularListesi
        taban={taban}
        duyurular={aktifDuyurular.map((d) => ({
          id: d.id,
          baslik: d.baslik,
          aciklama: d.aciklama,
          imageUrl: d.imageUrl,
          baslangic: d.baslangic
            ? d.baslangic.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
            : null,
          bitis: d.bitis
            ? d.bitis.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
            : null,
        }))}
      />
    </MusteriKabuk>
  );
}
