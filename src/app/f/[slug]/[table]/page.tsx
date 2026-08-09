import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SurveyForm } from "@/components/SurveyForm";
import { ViewTracker } from "@/components/ViewTracker";

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
    title: business ? `${business.name} — Görüşünüz` : "Geri bildirim",
    robots: { index: false },
  };
}

export default async function SurveyPage({ params }: { params: Promise<Params> }) {
  const { slug, table: tableNumber } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      account: true,
      categories: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  // Aboneliği biten/askıya alınan hesabın QR'ları da çalışmaz.
  if (!business || !business.account.active) notFound();

  const table = await prisma.table.findUnique({
    where: {
      businessId_tableNumber: {
        businessId: business.id,
        tableNumber: decodeURIComponent(tableNumber),
      },
    },
  });
  if (!table || !table.active) notFound();

  const tableLabel = table.isEntrance ? "Giriş" : `Masa ${table.tableNumber}`;
  const hasLogo = Boolean(business.logoUrl);

  // Arka plan görseli: kapak varsa o, yoksa logo. Sabitlenmiş ve kırpılmış
  // olarak tüm ekranı kaplar; üstüne konan beyaz perde sayesinde soluklaşır,
  // böylece metin okunur kalır ve görsel gerilmediği için bozulmaz.
  const backdrop = business.coverUrl ?? business.logoUrl;

  return (
    <main
      className={`relative min-h-dvh ${backdrop ? "" : "bg-slate-50"}`}
    >
      {/* --- Arka plan: işletmenin görseli tüm ekranı kaplar.
          object-cover ile oranı korunur (gerilme/pikselleşme olmaz), üstündeki
          beyaz perde ve hafif bulanıklık sayesinde soluklaşır. */}
      {backdrop ? (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-50" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt=""
            className="h-full w-full scale-110 object-cover blur-[3px]"
          />
          {/* Perde: görsel seçilir ama metin okunur kalır. Yüzde düşerse
              kartların üstündeki yazı zeminle karışmaya başlıyor. */}
          <div className="absolute inset-0 bg-slate-50/78" />
        </div>
      ) : null}

      <header className="relative">
        {/* Marka rengi şeridi: baskıdaki kartla aynı renk. */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: business.brandColor }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-md px-4">
          <div className="flex flex-col items-center pt-7 text-center">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl!}
                alt={`${business.name} logosu`}
                className="h-24 w-24 rounded-full bg-white object-cover shadow-md ring-4 ring-white"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-md ring-4 ring-white"
                style={{ backgroundColor: business.brandColor }}
                aria-hidden="true"
              >
                {business.name.trim().charAt(0).toLocaleUpperCase("tr")}
              </div>
            )}

            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
              {business.name}
            </h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {tableLabel}
              </span>
              30 saniyenizi alır
            </p>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-md px-4 pt-6 pb-8">
        <ViewTracker slug={business.slug} tableNumber={table.tableNumber} />

        <SurveyForm
          slug={business.slug}
          businessName={business.name}
          brandColor={business.brandColor}
          logoUrl={business.logoUrl}
          tableNumber={table.tableNumber}
          tableLabel={tableLabel}
          categories={business.categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  );
}
