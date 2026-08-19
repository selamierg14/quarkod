import Link from "next/link";
import { requireMenuErisim, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, TabLink } from "@/components/ui";
import { CategoryHeader, ItemRow, NewCategoryForm, NewItemForm } from "./MenuForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "QR Menü" };

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gorunum?: string }>;
}) {
  const user = await requireMenuErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;
  const liste = query.gorunum === "liste";

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

  // Sekmeler ve işletme seçici aynı ?isletme parametresini taşımalı, yoksa
  // sekme değişince seçili işletme sıfırlanır.
  const sekmeHref = (gorunum: "liste" | "duzenle") =>
    `/admin/menu?${new URLSearchParams({
      ...(query.isletme ? { isletme: query.isletme } : {}),
      ...(gorunum === "liste" ? { gorunum: "liste" } : {}),
    }).toString()}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
        <TabLink href={sekmeHref("duzenle")} active={!liste}>
          Düzenle
        </TabLink>
        <TabLink href={sekmeHref("liste")} active={liste}>
          Listele
        </TabLink>
      </div>

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

      {businesses.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/admin/menu?${new URLSearchParams({
                isletme: b.id,
                ...(liste ? { gorunum: "liste" } : {}),
              }).toString()}`}
              className={`rounded-chip px-3 py-1.5 text-small ${
                b.id === secili.id
                  ? "bg-ink text-white"
                  : "bg-surface text-ink-soft ring-1 ring-line hover:bg-canvas"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      ) : null}

      {liste ? (
        // Müşterinin masada gördüğü ekranın birebir aynısı — canlı,
        // tıklanabilir bir iframe. Telefon genişliğinde: bu ekran zaten
        // yalnızca mobilde açılıyor.
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface shadow-pop ring-8 ring-ink">
          <iframe
            src={`/f/${secili.slug}/1/menu`}
            title="Müşteri gözüyle QR menü"
            className="h-[720px] w-full"
          />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
