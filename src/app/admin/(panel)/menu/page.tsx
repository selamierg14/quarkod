import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { CategoryHeader, ItemRow, NewCategoryForm, NewItemForm } from "./MenuForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "QR Menü" };

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireUser();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  // Menü tek bir işletmeye ait; birden fazla işletmesi olan kullanıcı
  // hangisini düzenlediğini seçer.
  const secili =
    businesses.find((b) => b.id === query.isletme) ?? businesses[0];

  const menuAcik = await prisma.business
    .findUnique({
      where: { id: secili.id },
      select: { account: { select: { menuEnabled: true } } },
    })
    .then((b) => Boolean(b?.account.menuEnabled));

  if (!menuAcik) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold tracking-tight">QR Menü</h1>
        <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <p className="font-medium">Bu hesapta QR menü modülü kapalı.</p>
          <p className="mt-2 text-sm text-slate-500">
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
      <div>
        <h1 className="text-lg font-semibold tracking-tight">QR Menü</h1>
        <p className="mt-1 text-sm text-slate-500">
          Müşteri masadaki kodu okuttuğunda bu menüyü görür ve yediklerini
          puanlayabilir.{" "}
          <Link
            href={`/f/${secili.slug}/1/menu`}
            target="_blank"
            className="underline underline-offset-2"
          >
            Müşteri gözüyle bak
          </Link>
        </p>
      </div>

      {businesses.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/admin/menu?isletme=${b.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                b.id === secili.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-slate-500">
        {kategoriler.length} bölüm · {toplamUrun} ürün
        {tukenen > 0 ? (
          <span className="text-amber-700"> · {tukenen} ürün tükendi olarak işaretli</span>
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
            <li key={kategori.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              <CategoryHeader
                id={kategori.id}
                name={kategori.name}
                active={kategori.active}
                urunSayisi={kategori.items.length}
              />

              {kategori.items.length === 0 ? (
                <p className="px-4 pt-3 text-sm text-slate-400">Bu bölümde ürün yok.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
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

      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <NewCategoryForm businessId={secili.id} />
      </div>
    </div>
  );
}
