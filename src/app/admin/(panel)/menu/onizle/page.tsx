import { requireMenuErisim } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { IsletmeSecici, MenuSekmeleri } from "../MenuUst";
import { menuSecimi } from "../_secim";

export const dynamic = "force-dynamic";

export const metadata = { title: "Menü görünümüm" };

export default async function MenuOnizlePage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireMenuErisim();
  const query = await searchParams;
  const { businesses, secili, menuAcik } = await menuSecimi(user, query.isletme);

  if (!secili) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-5">
      <MenuSekmeleri aktif="gorunum" />

      <PageHeader
        ikon="📱"
        renk="sky"
        title="Menü görünümüm"
        description="Müşteri masadaki kodu okuttuğunda tam olarak bunu görüyor. Aşağıdaki ekran canlı — dokunup gezinebilirsiniz."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/menu/onizle" />

      {!menuAcik ? (
        <EmptyState>Bu hesapta QR menü modülü kapalı.</EmptyState>
      ) : (
        // Telefon genişliğinde çerçeve: bu ekran zaten yalnızca mobilde açılıyor.
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface shadow-pop ring-8 ring-ink">
          <iframe
            src={`/f/${secili.slug}/1/menu`}
            title="Müşteri gözüyle QR menü"
            className="h-[720px] w-full"
          />
        </div>
      )}
    </div>
  );
}
