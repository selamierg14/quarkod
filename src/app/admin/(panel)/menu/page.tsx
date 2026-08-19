import Link from "next/link";
import { requireMenuErisim } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { CategoryHeader, ItemRow, NewCategoryForm, NewItemForm } from "./MenuForms";
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
  const { businesses, secili, menuAcik } = await menuSecimi(user, query.isletme);

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

  const kategoriler = await prisma.menuCategory.findMany({
    where: { businessId: secili.id },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const toplamUrun = kategoriler.reduce((t, k) => t + k.items.length, 0);
  const tukenen = kategoriler.reduce(
    (t, k) => t + k.items.filter((u) => u.soldOut && u.active).length,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <MenuSekmeleri aktif="duzenle" />

      <div>
        <h1 className="text-title font-semibold">QR Menü</h1>
        <p className="mt-1 text-small text-ink-muted">
          Müşteri masadaki kodu okuttuğunda bu menüyü görür ve yediklerini
          puanlayabilir.{" "}
          <Link
            href={`/f/${secili.slug}/1/menu`}
            target="_blank"
            className="underline underline-offset-2"
          >
            Yeni sekmede aç
          </Link>
        </p>
      </div>

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/menu" />

      <p className="text-small text-ink-muted">
        {kategoriler.length} bölüm · {toplamUrun} ürün
        {tukenen > 0 ? (
          <span className="text-warning-ink"> · {tukenen} ürün tükendi olarak işaretli</span>
        ) : null}
      </p>

      {kategoriler.length === 0 ? (
        <EmptyState>
          Menü boş. Önce bir bölüm ekleyin (Kahveler, Tatlılar…), sonra içine
          ürünleri girin.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {kategoriler.map((kategori) => (
            <li key={kategori.id} className="overflow-hidden rounded-control bg-surface ring-1 ring-line">
              <CategoryHeader
                id={kategori.id}
                name={kategori.name}
                active={kategori.active}
                urunSayisi={kategori.items.length}
              />

              {kategori.items.length === 0 ? (
                <p className="px-4 pt-3 text-small text-ink-faint">Bu bölümde ürün yok.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {kategori.items.map((urun) => (
                    <ItemRow key={urun.id} urun={urun} brandColor={secili.brandColor} />
                  ))}
                </ul>
              )}

              <div className="flex">
                <NewItemForm categoryId={kategori.id} brandColor={secili.brandColor} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-control bg-surface p-5 ring-1 ring-line">
        <NewCategoryForm businessId={secili.id} />
      </div>
    </div>
  );
}
