import { Megaphone } from "lucide-react";
import { requireMenuErisim, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { gunBaslangici, gunGirdisi } from "@/lib/cekirdek/gun";
import { duyuruDurumu } from "@/lib/isletme/duyuru";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import { IsletmeSecici } from "../menu/MenuUst";
import { DuyuruSatiri, NewDuyuruForm } from "./DuyuruForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Duyurular" };

/**
 * Tarih alanı için yyyy-aa-gg. Gün başına indirgeniyor: eski kayıtlar UTC
 * gece yarısı saklanmış olabilir, yenileri İstanbul gece yarısı.
 * Önceden görünen metin ("05.01.2026") tarih alanına geri ayrıştırılıyordu.
 */
function gunAnahtari(d: Date | null): string {
  return d ? gunGirdisi(gunBaslangici(d)) : "";
}

function tarihMetni(baslangic: Date | null, bitis: Date | null): string | null {
  if (!baslangic && !bitis) return null;
  const bicim = (d: Date) => d.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  return `${baslangic ? bicim(baslangic) : "şimdi"} – ${bitis ? bicim(bitis) : "süresiz"}`;
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
    <div className="flex flex-col gap-6">
      <PageHeader
        ikon={<Megaphone className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="Duyurular"
        description="QR karşılama ekranında ayrı, tıklanan bir kart olarak çıkar — görsel taşıyabilir, birden fazla olabilir ve tarih aralığına bağlanabilir (ör. sadece hafta sonu göster)."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/duyurular" />

      <NewDuyuruForm
        // İşletme değişince form da sıfırlansın.
        key={secili.id}
        businessId={secili.id}
        isletmeSayisi={businesses.length}
        acikBasla={toplam === 0}
      />

      {duyurular.length === 0 ? (
        toplam === 0 ? null : <EmptyState>Bu sayfada duyuru yok.</EmptyState>
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
              durum={duyuruDurumu(d)}
              baslangic={gunAnahtari(d.baslangic)}
              bitis={gunAnahtari(d.bitis)}
              tarihMetni={tarihMetni(d.baslangic, d.bitis)}
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
