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

  const counts = await Promise.all(
    businesses.map(async (business) => ({
      id: business.id,
      tables: await prisma.table.count({
        where: { businessId: business.id, active: true },
      }),
      categories: await prisma.categoryTemplate.count({
        where: { businessId: business.id, active: true },
      }),
      feedbacks: await prisma.feedback.count({ where: { businessId: business.id } }),
    })),
  );
  const countMap = new Map(counts.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">İşletmeler</h1>

      <ul className="grid gap-3 sm:grid-cols-2">
        {businesses.map((business) => {
          const count = countMap.get(business.id);
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
                  {count?.tables ?? 0} QR noktası · {count?.categories ?? 0} kategori ·{" "}
                  {count?.feedbacks ?? 0} geri bildirim
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
