import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/constants";
import { NewBusinessForm } from "./NewBusinessForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "İşletmeler" };

export default async function BusinessListPage() {
  const user = await requireUser();
  const businesses = await visibleBusinesses(user);

  // İşletme başına üç ayrı sorgu yerine üç toplu sorgu: 10 işletmede
  // 31 sorgudan 4'e iner.
  const ids = businesses.map((b) => b.id);
  const [tableCounts, categoryCounts, feedbackCounts] = await Promise.all([
    prisma.table.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids }, active: true },
      _count: { _all: true },
    }),
    prisma.categoryTemplate.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids }, active: true },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const toMap = (rows: { businessId: string; _count: { _all: number } }[]) =>
    new Map(rows.map((row) => [row.businessId, row._count._all]));

  const tables = toMap(tableCounts);
  const categories = toMap(categoryCounts);
  const feedbacks = toMap(feedbackCounts);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">İşletmeler</h1>

      {businesses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Henüz işletme eklenmemiş. Aşağıdan ilk işletmenizi açın; kategori
          şablonu ve QR kodları otomatik hazırlanır.
        </p>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {businesses.map((business) => {
          return (
            <li key={business.id}>
              <Link
                href={`/admin/isletmeler/${business.id}`}
                className="block rounded-xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-300"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: business.brandColor }}
                  />
                  {business.name}
                </span>
                <p className="mt-1 text-sm text-slate-500">
                  {BUSINESS_TYPES[business.type as BusinessType] ?? business.type}
                  {business.address ? ` · ${business.address}` : ""}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {tables.get(business.id) ?? 0} QR noktası ·{" "}
                  {categories.get(business.id) ?? 0} kategori ·{" "}
                  {feedbacks.get(business.id) ?? 0} geri bildirim
                </p>
                {!business.googleReviewUrl ? (
                  <p className="mt-2 text-xs text-amber-600">
                    Google yorum linki tanımlı değil — 5 yıldız yönlendirmesi çalışmaz.
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {user.role === "owner" ? <NewBusinessForm /> : null}
    </div>
  );
}
