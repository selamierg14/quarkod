import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/constants";
import { SettingsForm } from "./SettingsForm";
import { CategoryManager } from "./CategoryManager";
import { TableManager } from "./TableManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "İşletme ayarları" };

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  if (!await canAccessBusiness(user, id)) notFound();

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
      tables: { orderBy: [{ isEntrance: "desc" }, { tableNumber: "asc" }] },
    },
  });
  if (!business) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/isletmeler"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← İşletmeler
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: business.brandColor }}
            />
            {business.name}
          </h1>
          <p className="text-sm text-slate-500">
            {BUSINESS_TYPES[business.type as BusinessType] ?? business.type} ·{" "}
            <code className="text-xs">/f/{business.slug}/…</code>
          </p>
        </div>

        <Link
          href={`/admin/isletmeler/${business.id}/qr`}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          QR kodlarını üret / yazdır
        </Link>
      </div>

      <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
          Ayarlar
        </h2>
        <SettingsForm
          business={{
            id: business.id,
            name: business.name,
            type: business.type,
            address: business.address,
            googleReviewUrl: business.googleReviewUrl,
            brandColor: business.brandColor,
            notifyThreshold: business.notifyThreshold,
            googleRedirect: business.googleRedirect,
            qrCardText: business.qrCardText,
            logoUrl: business.logoUrl,
            coverUrl: business.coverUrl,
          }}
          isOwner={user.role === "owner"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Anket kategorileri
          </h2>
          <CategoryManager
            businessId={business.id}
            categories={business.categories.map((c) => ({
              id: c.id,
              name: c.name,
              active: c.active,
            }))}
          />
        </section>

        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Masalar / QR noktaları
          </h2>
          <TableManager
            businessId={business.id}
            tables={business.tables.map((t) => ({
              id: t.id,
              tableNumber: t.tableNumber,
              isEntrance: t.isEntrance,
              active: t.active,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
