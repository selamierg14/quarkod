import { allowedBusinessIds, requireOwner } from "@/lib/auth";
import { getBusinessStats } from "@/lib/stats";
import { EmptyState } from "@/components/ui";
import { DeltaBadge, TrendChart } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

export const metadata = { title: "İşletme kıyaslama" };

export default async function ComparisonPage() {
  const user = await requireOwner();
  // Kapsamsız çağrı bütün kiracıların işletmelerini getirirdi.
  const stats = await getBusinessStats(await allowedBusinessIds(user));
  const withData = stats.filter((stat) => stat.total > 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">İşletme kıyaslama</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kategori setleri işletmeye göre değiştiği için karşılaştırma genel
          yıldız ortalaması üzerinden yapılır. Kategori kırılımı her işletmenin
          kendi içinde anlamlıdır.
        </p>
      </div>

      {withData.length === 0 ? (
        <EmptyState>Kıyaslama için henüz yeterli geri bildirim yok.</EmptyState>
      ) : (
        <>
          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Genel ortalama
            </h2>
            <ul className="mt-4 space-y-3">
              {[...withData]
                .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
                .map((stat) => (
                  <li key={stat.id}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{stat.name}</span>
                      <span className="tabular-nums text-slate-500">
                        {stat.average?.toFixed(2)} / 5 · {stat.total} kayıt
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((stat.average ?? 0) / 5) * 100}%`,
                          backgroundColor: stat.brandColor,
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Haftalık ortalama puan seyri
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Her nokta bir haftanın <strong>ortalama yıldız puanını</strong>{" "}
              gösterir (dikey eksen 1–5). Yatay eksen hafta başlangıç tarihidir.
              Veri gelmeyen haftalarda çizgi kesilir — sıfır puan almış gibi
              görünmesin diye.
            </p>
            <div className="mt-4 space-y-5">
              {withData.map((stat) => (
                <div key={stat.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stat.brandColor }}
                      />
                      {stat.name}
                    </span>
                    <DeltaBadge delta={stat.delta} />
                  </div>
                  <TrendChart points={stat.trend} color={stat.brandColor} />
                  <p className="-mt-1 text-xs text-slate-400">
                    Son 12 hafta ·{" "}
                    {stat.trend.filter((t) => t.count > 0).length} haftada veri var ·
                    genel ortalama {stat.average?.toFixed(2) ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {withData.map((stat) => (
              <div
                key={stat.id}
                className="rounded-xl bg-white p-5 ring-1 ring-slate-200"
              >
                <h3 className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stat.brandColor }}
                  />
                  {stat.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Son 7 gün: {stat.last7Days} kayıt
                  {stat.last30Average !== null
                    ? ` · son 30 gün ortalaması ${stat.last30Average.toFixed(2)}`
                    : ""}
                </p>

                {stat.weakCategories.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Son 90 günde kategori puanı girilmemiş.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {stat.weakCategories.map((category) => (
                      <li key={category.name} className="text-sm">
                        <div className="flex items-baseline justify-between">
                          <span className="text-slate-700">{category.name}</span>
                          <span className="tabular-nums text-slate-500">
                            {category.average.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              category.average < 3
                                ? "bg-red-500"
                                : category.average < 4
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${(category.average / 5) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
