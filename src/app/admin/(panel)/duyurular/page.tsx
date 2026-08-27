import { requireMenuErisim, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { IsletmeSecici } from "../menu/MenuUst";
import { DuyuruSatiri, NewDuyuruForm } from "./DuyuruForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Duyurular" };

function tarihGirdisi(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("tr-TR");
}

export default async function DuyurularPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireMenuErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];

  const duyurular = await prisma.duyuru.findMany({
    where: { businessId: secili.id },
    orderBy: [{ aktif: "desc" }, { sortOrder: "desc" }],
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon="📣"
        renk="violet"
        title="Duyurular"
        description="QR karşılama ekranında ayrı, tıklanan bir kart olarak çıkar — görsel taşıyabilir, birden fazla olabilir ve tarih aralığına bağlanabilir (ör. sadece hafta sonu göster)."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/duyurular" />

      <SectionCard
        ikon="📣"
        renk="amber"
        title="Yeni duyuru"
        description="QR karşılama ekranında müşterinin göreceği kısa haber."
      >
        <NewDuyuruForm businessId={secili.id} isletmeSayisi={businesses.length} />
      </SectionCard>

      {duyurular.length === 0 ? (
        <EmptyState>Henüz duyuru eklenmedi.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {duyurular.map((d) => (
            <DuyuruSatiri
              key={d.id}
              id={d.id}
              baslik={d.baslik}
              aciklama={d.aciklama}
              imageUrl={d.imageUrl}
              aktif={d.aktif}
              baslangic={tarihGirdisi(d.baslangic)}
              bitis={tarihGirdisi(d.bitis)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
