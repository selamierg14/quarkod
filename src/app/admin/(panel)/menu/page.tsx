import { Plus, Utensils } from "lucide-react";
import Link from "next/link";
import { requireMenuErisim } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import {
  CategoryHeader,
  ItemRow,
  MenuyuKopyala,
  NewCategoryForm,
  NewItemForm,
  TumMenuyuSil,
} from "./MenuForms";
import { IsletmeSecici, MenuSekmeleri } from "./MenuUst";
import { menuSecimi } from "./_secim";

export const dynamic = "force-dynamic";

export const metadata = { title: "QR Menü" };

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireMenuErisim();
  const query = await searchParams;
  const { businesses, secili, menuAcik, onizlemeMasa } = await menuSecimi(
    user,
    query.isletme,
  );

  if (!secili) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  if (!menuAcik) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-semibold">QR Menü</h1>
        <div className="rounded-control bg-surface p-6 ring-1 ring-line">
          <p className="font-medium">Bu hesapta QR menü modülü kapalı.</p>
          <p className="mt-2 text-small text-ink-muted">
            QR menü, müşterinin masadaki kodu okuttuğunda fotoğraflı menünüzü
            görmesini sağlar; ayrıca ne yediğini seçip tek tek puanlayabilir,
            böylece hangi ürünün sevilmediğini isim isim görürsünüz. Açtırmak
            için bizimle iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  const kardesIdler = businesses.filter((b) => b.id !== secili.id).map((b) => b.id);

  const [kategoriler, kardesSayilari] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { businessId: secili.id },
      orderBy: { sortOrder: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    // Aynı hesaptaki diğer şubeler — "Menüyü kopyala" bölümünde hangisinin
    // menüsü zaten dolu olduğunu göstermek için bölüm sayısı da alınıyor.
    // Şube başına ayrı bir count yerine tek groupBy: 20 şubeli bir zincirde
    // önceden 20 paralel sorgu atılıyordu, artık tek sorgu.
    kardesIdler.length > 0
      ? prisma.menuCategory.groupBy({
          by: ["businessId"],
          where: { businessId: { in: kardesIdler } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const sayiByBusiness = new Map(kardesSayilari.map((s) => [s.businessId, s._count._all]));
  const kardesler = businesses
    .filter((b) => b.id !== secili.id)
    .map((b) => ({ id: b.id, name: b.name, bolumSayisi: sayiByBusiness.get(b.id) ?? 0 }));

  const toplamUrun = kategoriler.reduce((t, k) => t + k.items.length, 0);
  const tukenen = kategoriler.reduce(
    (t, k) => t + k.items.filter((u) => u.soldOut && u.active).length,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <MenuSekmeleri aktif="duzenle" />

      <PageHeader
        ikon={<Utensils className="h-4 w-4" aria-hidden="true" />}
        renk="amber"
        title="Menümü düzenle"
        description="Bölümler ve içindeki ürünler. Müşteri masadaki kodu okutunca burada gördüklerinizi görür ve yediklerini puanlayabilir."
        action={
          onizlemeMasa ? (
            <Link
              href={`/f/${secili.slug}/${encodeURIComponent(onizlemeMasa)}/menu`}
              target="_blank"
              className="rounded-control border border-line bg-surface px-3.5 py-2 text-small font-medium text-ink-soft transition hover:bg-canvas"
            >
              Müşteri gözüyle aç ↗
            </Link>
          ) : null
        }
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/menu" />

      {kategoriler.length === 0 ? (
        <EmptyState
          baslik="Menünüz henüz boş"
          ikon={<Utensils className="h-4 w-4" aria-hidden="true" />}
          aksiyon={
            <Link
              href="/admin/menu/sablonlar"
              className="rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2.5 text-small font-semibold text-white shadow-card transition hover:brightness-110"
            >
              Hazır şablonlara göz at →
            </Link>
          }
        >
          En hızlı yol: sektörünüze uygun bir şablon seçin, bölümler ve örnek
          fiyatlar hazır gelsin. Ya da aşağıdan kendi bölümünüzü ekleyip
          sıfırdan kurun.
        </EmptyState>
      ) : null}

      {/* Sık yapılan iş en üstte: yeni bölüm eklemek için sayfanın sonuna
          kadar inmek gerekiyordu. */}
      <SectionCard
        ikon={<Plus className="h-4 w-4" aria-hidden="true" />}
        renk="emerald"
        title="Yeni bölüm ekle"
        description="Kahveler, Tatlılar, Ana Yemekler… Ürünler bu bölümlerin içine girer."
      >
        <NewCategoryForm businessId={secili.id} />
      </SectionCard>

      {kategoriler.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-chip bg-surface px-3 py-1.5 text-small font-semibold text-ink shadow-card ring-1 ring-line">
              {kategoriler.length} bölüm
            </span>
            <span className="rounded-chip bg-surface px-3 py-1.5 text-small font-semibold text-ink shadow-card ring-1 ring-line">
              {toplamUrun} ürün
            </span>
            {tukenen > 0 ? (
              <span className="rounded-chip bg-warning-soft px-3 py-1.5 text-small font-semibold text-warning-ink ring-1 ring-warning/25">
                {tukenen} ürün bugün tükendi
              </span>
            ) : null}
          </div>

          {/* Menü doluyken şablon uygulanamıyor; sıfırdan kurmak isteyen
              önce buradan boşaltıyor. Uzun ürün listesinin dibinde
              aranmasın diye listenin üstünde duruyor. */}
          <TumMenuyuSil
            businessId={secili.id}
            bolumSayisi={kategoriler.length}
            urunSayisi={toplamUrun}
          />

          <ul className="flex flex-col gap-4">
            {kategoriler.map((kategori) => (
              <li
                key={kategori.id}
                className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
              >
                <CategoryHeader
                  id={kategori.id}
                  name={kategori.name}
                  active={kategori.active}
                  urunSayisi={kategori.items.length}
                />

                {kategori.items.length === 0 ? (
                  <p className="px-5 pt-4 text-small text-ink-muted">
                    Bu bölümde henüz ürün yok — aşağıdan ekleyin.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {kategori.items.map((urun) => (
                      <ItemRow key={urun.id} urun={urun} brandColor={secili.brandColor} />
                    ))}
                  </ul>
                )}

                <div className="flex border-t border-line bg-canvas/50">
                  <NewItemForm categoryId={kategori.id} brandColor={secili.brandColor} />
                </div>
              </li>
            ))}
          </ul>

          <MenuyuKopyala businessId={secili.id} hedefler={kardesler} />
        </>
      ) : null}
    </div>
  );
}
