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
            className="text-small text-ink-muted hover:text-ink"
          >
            ← İşletmeler
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-title font-semibold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: business.brandColor }}
            />
            {business.name}
          </h1>
          <p className="text-small text-ink-muted">
            {BUSINESS_TYPES[business.type as BusinessType] ?? business.type} ·{" "}
            <code className="text-caption">/f/{business.slug}/…</code>
          </p>
        </div>

        <Link
          href={`/admin/isletmeler/${business.id}/qr`}
          className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white"
        >
          QR kodlarını üret / yazdır
        </Link>
      </div>

      <section className="rounded-control bg-surface p-5 ring-1 ring-line">
        <h2 className="mb-4 text-caption font-medium tracking-wide text-ink-muted uppercase">
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
            instagramUrl: business.instagramUrl,
            wifiSsid: business.wifiSsid,
            wifiPassword: business.wifiPassword,
            announcement: business.announcement,
            announcementActive: business.announcementActive,
            yemeksepetiUrl: business.yemeksepetiUrl,
            getirUrl: business.getirUrl,
            trendyolUrl: business.trendyolUrl,
            migrosUrl: business.migrosUrl,
          }}
          isOwner={user.role === "owner"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-control bg-surface p-5 ring-1 ring-line">
          <h2 className="mb-4 text-caption font-medium tracking-wide text-ink-muted uppercase">
            Anket kategorileri
          </h2>
          <CategoryManager
            businessId={business.id}
            categories={business.categories.map((c) => ({
              id: c.id,
              name: c.name,
              active: c.active,
              problemOptions: c.problemOptions,
            }))}
          />
        </section>

        <section className="rounded-control bg-surface p-5 ring-1 ring-line">
          <h2 className="mb-4 text-caption font-medium tracking-wide text-ink-muted uppercase">
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
