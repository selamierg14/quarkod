import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tables: true } } },
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Müşteri Memnuniyet Sistemi
      </h1>
      <p className="mt-2 text-slate-600">
        Müşteriler masadaki QR kodu okutarak anketi doldurur. Yönetim tarafı için
        panele giriş yapın.
      </p>

      <Link
        href="/admin"
        className="mt-6 rounded-xl bg-slate-900 px-5 py-3.5 text-center font-medium text-white active:scale-[0.99]"
      >
        Yönetim paneline git
      </Link>

      {businesses.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Tanımlı işletmeler
          </h2>
          <ul className="mt-3 space-y-2">
            {businesses.map((business) => (
              <li
                key={business.id}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: business.brandColor }}
                  />
                  <span className="font-medium">{business.name}</span>
                </span>
                <span className="text-sm text-slate-400">
                  {business._count.tables} QR noktası
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
