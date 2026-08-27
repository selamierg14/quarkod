import { Star } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { CategoryManager } from "../CategoryManager";
import { IsletmeUst } from "../IsletmeUst";
import { isletmeyiYukle } from "../_veri";

export const dynamic = "force-dynamic";

export const metadata = { title: "Anket kategorileri" };

export default async function KategorilerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { business } = await isletmeyiYukle(id);

  return (
    <div className="flex flex-col gap-5">
      <IsletmeUst business={business} aktif="kategoriler" />

      <SectionCard
        ikon={<Star className="h-4 w-4" aria-hidden="true" />}
        renk="amber"
        title="Anket kategorileri"
        description="Müşteri yıldız verdikten sonra bu başlıkları tek tek puanlar."
      >
        <p className="mb-4 rounded-control bg-amber-50/70 px-4 py-3 text-small text-ink-soft ring-1 ring-amber-100">
          Bir başlığı listeden çıkarmak yerine <strong>kapatın</strong> — eski
          kayıtlardaki puanlar böylece korunur. Müşteri bir başlığa 1-2 yıldız
          verirse altındaki seçenekler açılır ve sorunun tam yerini
          işaretleyebilir.
        </p>
        <CategoryManager
          businessId={business.id}
          categories={business.categories.map((c) => ({
            id: c.id,
            name: c.name,
            active: c.active,
            problemOptions: c.problemOptions,
          }))}
        />
      </SectionCard>
    </div>
  );
}
