import { requireMenuErisim } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { IsletmeSecici, MenuSekmeleri } from "../MenuUst";
import { SablonSecici } from "../SablonSecici";
import { menuSecimi } from "../_secim";
import type { BusinessType } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Hazır menü şablonları" };

export default async function SablonlarPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireMenuErisim();
  const query = await searchParams;
  const { businesses, secili, menuAcik } = await menuSecimi(user, query.isletme);

  if (!secili) return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;

  const mevcutBolum = menuAcik
    ? await prisma.menuCategory.count({ where: { businessId: secili.id } })
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <MenuSekmeleri aktif="sablonlar" />

      <PageHeader
        ikon="✨"
        renk="amber"
        title="Hazır menü şablonları"
        description="Sıfırdan ürün girmek yerine sektörünüze uygun bir şablonla başlayın; bölümler ve örnek fiyatlar hazır gelir, sonra kendi fiyatlarınıza göre düzenlersiniz."
      />

      <IsletmeSecici
        businesses={businesses}
        seciliId={secili.id}
        taban="/admin/menu/sablonlar"
      />

      {!menuAcik ? (
        <EmptyState baslik="QR menü modülü kapalı" ikon="🔒">
          Bu hesapta QR menü modülü açık değil. Açtırmak için bizimle iletişime
          geçin.
        </EmptyState>
      ) : (
        <SablonSecici
          businessId={secili.id}
          businessType={secili.type as BusinessType}
          mevcutBolumSayisi={mevcutBolum}
        />
      )}
    </div>
  );
}
