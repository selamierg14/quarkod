import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MusteriKabuk } from "@/components/MusteriKabuk";
import { MENU_TAGS, formatPrice, parseTags } from "@/lib/menu";
import { menuIcerigi, qrSayfaVerisi } from "@/lib/qr-sayfa";

type Params = { slug: string; table: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug } });
  return {
    title: business ? `${business.name} — Menü` : "Menü",
    robots: { index: false },
  };
}

export default async function MenuPage({ params }: { params: Promise<Params> }) {
  const { slug, table: tableParam } = await params;
  const { business, table, tableLabel, menuAcik } = await qrSayfaVerisi(slug, tableParam);
  if (!menuAcik) notFound();

  const kategoriler = await menuIcerigi(business.id);
  const dolu = kategoriler.filter((k) => k.items.length > 0);
  if (dolu.length === 0) notFound();

  const anketAdresi = `/f/${business.slug}/${encodeURIComponent(table.tableNumber)}/anket`;

  return (
    <MusteriKabuk business={business} tableLabel={tableLabel} altBaslik="Menü" dar={false}>
      {/* Değerlendirme çağrısı hem üstte hem altta: menüyü baştan okumadan
          karar veren de, sonuna kadar inen de görsün. */}
      <Link
        href={anketAdresi}
        className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-white/95 px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200"
      >
        <span>
          <span className="font-medium text-slate-900">Deneyiminizi değerlendirin</span>
          <span className="block text-xs text-slate-500">
            Yediklerinizi tek tek puanlayabilirsiniz
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-400">
          →
        </span>
      </Link>

      {/* Bölümler arası hızlı geçiş: uzun menüde kaydırmak yorucu. */}
      {dolu.length > 1 ? (
        <nav aria-label="Menü bölümleri" className="mb-4 flex flex-wrap gap-1.5">
          {dolu.map((k) => (
            <a
              key={k.id}
              href={`#bolum-${k.id}`}
              className="rounded-full bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200"
            >
              {k.name}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-col gap-5">
        {dolu.map((kategori) => (
          <section key={kategori.id} id={`bolum-${kategori.id}`} className="scroll-mt-4">
            <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              {kategori.name}
            </h2>

            <ul className="overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200">
              {kategori.items.map((urun) => {
                const etiketler = parseTags(urun.tags);
                return (
                  <li
                    key={urun.id}
                    className={`flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 ${
                      urun.soldOut ? "opacity-55" : ""
                    }`}
                  >
                    {urun.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urun.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-slate-900">{urun.name}</h3>
                        {urun.priceKurus !== null ? (
                          <span className="shrink-0 font-medium text-slate-900 tabular-nums">
                            {formatPrice(urun.priceKurus)}
                          </span>
                        ) : null}
                      </div>

                      {urun.description ? (
                        <p className="mt-0.5 text-sm text-slate-500">{urun.description}</p>
                      ) : null}

                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {urun.soldOut ? (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white">
                            Bugün yok
                          </span>
                        ) : null}
                        {etiketler.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                          >
                            {MENU_TAGS[t]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Link
        href={anketAdresi}
        className="mt-6 flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-medium text-white shadow-sm"
        style={{ backgroundColor: business.brandColor }}
      >
        Deneyiminizi değerlendirin
      </Link>

      <p className="mt-3 text-center text-xs text-slate-400">
        Fiyatlara KDV dahildir. Menü içeriği işletme tarafından güncellenir.
      </p>
    </MusteriKabuk>
  );
}
