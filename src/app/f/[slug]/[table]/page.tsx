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

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-md px-4 py-8">
        <header className="mb-6 text-center">
          <div
            className="mx-auto mb-3 h-1.5 w-12 rounded-full"
            style={{ backgroundColor: business.brandColor }}
          />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {business.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tableLabel} · 30 saniyenizi alır
          </p>
        </header>

        <ViewTracker slug={business.slug} tableNumber={table.tableNumber} />

        <SurveyForm
          slug={business.slug}
          businessName={business.name}
          brandColor={business.brandColor}
          tableNumber={table.tableNumber}
          tableLabel={tableLabel}
          categories={business.categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  );
}
