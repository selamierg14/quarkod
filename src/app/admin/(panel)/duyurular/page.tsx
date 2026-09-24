import { Megaphone } from "lucide-react";
import { requireMenuErisim, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { EmptyState, PageHeader, Pagination, SectionCard } from "@/components/ui";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
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
  searchParams: Promise<{ isletme?: string; sayfa?: string; boyut?: string }>;
}) {
  const user = await requireMenuErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];

  const toplam = await prisma.duyuru.count({ where: { businessId: secili.id } });
  const durum = sayfaDurumu(query, toplam);

  const duyurular = await prisma.duyuru.findMany({
    where: { businessId: secili.id },
    orderBy: [{ aktif: "desc" }, { sortOrder: "desc" }],
    skip: durum.skip,
    take: durum.take,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<Megaphone className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="Duyurular"
        description="QR karşılama ekranında ayrı, tıklanan bir kart olarak çıkar — görsel taşıyabilir, birden fazla olabilir ve tarih aralığına bağlanabilir (ör. sadece hafta sonu göster)."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/duyurular" />

      <SectionCard
        ikon={<Megaphone className="h-4 w-4" aria-hidden="true" />}
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

      {cubukGosterilsinMi(toplam, durum.boyut) ? (
        <Pagination
          sayfa={durum.sayfa}
          toplamSayfa={toplamSayfa(toplam, durum.boyut)}
          toplamKayit={toplam}
          boyut={durum.boyut}
          aralik={aralikMetni(durum, toplam)}
          href={(s) =>
            `/admin/duyurular?${new URLSearchParams({
              ...(query.isletme ? { isletme: query.isletme } : {}),
              ...(durum.boyut !== 10 ? { boyut: String(durum.boyut) } : {}),
              sayfa: String(s),
            }).toString()}`
          }
        />
      ) : null}
    </div>
  );
}
