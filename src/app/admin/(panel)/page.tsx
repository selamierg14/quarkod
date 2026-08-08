import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { getBusinessStats } from "@/lib/stats";
import { prisma } from "@/lib/db";
import { EmptyState, StatCard, StatusBadge, Stars, formatDateTime } from "@/components/ui";
import { DeltaBadge, TrendChart } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

export const metadata = { title: "Özet" };

export default async function AdminHomePage() {
  const user = await requireUser();

  const businesses = await visibleBusinesses(user);
  const businessIds = businesses.map((b) => b.id);
  const stats = await getBusinessStats(businessIds);

  const recent = await prisma.feedback.findMany({
    where: { businessId: { in: businessIds } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { business: true, table: true },
  });

  const totalAll = stats.reduce((acc, s) => acc + s.total, 0);
  const openAll = stats.reduce((acc, s) => acc + s.openComplaints, 0);
  const googleShown = stats.reduce((acc, s) => acc + s.googleShown, 0);
  const googleClicked = stats.reduce((acc, s) => acc + s.googleClicked, 0);
  const totalViews = stats.reduce((acc, s) => acc + s.views, 0);
  // Pay ve payda aynı dönemden gelmeli; toplam kayıt sayısıyla oranlamak
  // ölçüm öncesi verileri de sayar ve %100'ün üstünde saçma sonuç verir.
  const completedSinceTracking = stats.reduce(
    (acc, s) => acc + s.feedbacksSinceTracking,
    0,
  );

  // Çözüm süresi ortalaması, işletmeleri kayıt sayısına göre ağırlıklandırmadan
  // basitçe ortalamak yanıltıcı olurdu; veri olanların ortalaması alınıyor.
  const withResolution = stats.filter((s) => s.avgResolutionHours !== null);
  const avgResolution = withResolution.length
    ? withResolution.reduce((acc, s) => acc + (s.avgResolutionHours ?? 0), 0) /
      withResolution.length
    : null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-lg font-semibold tracking-tight">
          {user.role === "manager"
            ? (businesses[0]?.name ?? "İşletme atanmamış")
            : businesses.length === 0
              ? "Henüz işletme yok"
              : businesses.length === 1
                ? businesses[0].name
                : "Tüm işletmeler"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {totalAll} geri bildirim · {openAll} açık şikayet
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-xl bg-white p-4 ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stat.brandColor }}
                  />
                  {stat.name}
                </span>
                <span className="text-sm tabular-nums text-slate-500">
                  {stat.average !== null ? `${stat.average.toFixed(1)} / 5` : "—"}
                </span>
              </div>

              <div className="mt-0.5 text-right">
                <DeltaBadge delta={stat.delta} />
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-[11px] text-slate-400 uppercase">Toplam</dt>
                  <dd className="text-lg font-semibold tabular-nums">{stat.total}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400 uppercase">Son 7 gün</dt>
                  <dd className="text-lg font-semibold tabular-nums">{stat.last7Days}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400 uppercase">Açık</dt>
                  <dd
                    className={`text-lg font-semibold tabular-nums ${stat.openComplaints > 0 ? "text-red-600" : ""}`}
                  >
                    {stat.openComplaints}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-slate-100 pt-2">
                <TrendChart points={stat.trend} color={stat.brandColor} height={90} />
              </div>

              {stat.weakCategories.length > 0 &&
              stat.weakCategories[0].average < 4 ? (
                <p className="mt-2 text-xs text-slate-500">
                  En zayıf başlık:{" "}
                  <span className="font-medium text-slate-700">
                    {stat.weakCategories[0].name}
                  </span>{" "}
                  ({stat.weakCategories[0].average.toFixed(1)})
                </p>
              ) : stat.weakCategories.length > 0 ? (
                <p className="mt-2 text-xs text-emerald-600">
                  Tüm başlıklar 4 puanın üzerinde.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {user.role === "owner" ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Google dönüşümü"
            value={
              googleShown
                ? `%${Math.round((googleClicked / googleShown) * 100)}`
                : "—"
            }
            hint={`${googleClicked} / ${googleShown} müşteri yorum sayfasına gitti`}
          />
          <StatCard
            label="Genel ortalama"
            value={
              totalAll
                ? (
                    stats.reduce((acc, s) => acc + (s.average ?? 0) * s.total, 0) /
                    totalAll
                  ).toFixed(2)
                : "—"
            }
            hint={
              businesses.length === 1
                ? "Tüm geri bildirimlerin ortalaması"
                : `${businesses.length} işletmenin ağırlıklı ortalaması`
            }
          />
          <StatCard
            label="Anket tamamlama"
            value={
              totalViews
                ? `%${Math.min(100, Math.round((completedSinceTracking / totalViews) * 100))}`
                : "—"
            }
            hint={
              totalViews
                ? `QR okutan ${totalViews} kişiden ${completedSinceTracking}'i anketi bitirdi`
                : "Ölçüm yeni — veri biriktikçe dolacak"
            }
          />
          <StatCard
            label="Ortalama çözüm süresi"
            value={
              avgResolution !== null ? `${avgResolution.toFixed(1)} sa` : "—"
            }
            hint="Şikayetin gelişinden çözülmesine kadar"
          />
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold tracking-tight">Son geri bildirimler</h2>
          <Link
            href="/admin/geri-bildirimler"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Tümü →
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState>
            Henüz geri bildirim yok. QR kodlarını masalara yerleştirdikten sonra
            buraya düşmeye başlayacak.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {recent.map((feedback) => (
              <li key={feedback.id}>
                <Link
                  href={`/admin/geri-bildirimler/${feedback.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <Stars value={feedback.overallRating} className="text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{feedback.business.name}</span>
                      <span className="text-slate-400">
                        {feedback.table
                          ? feedback.table.isEntrance
                            ? "Giriş"
                            : `Masa ${feedback.table.tableNumber}`
                          : "—"}
                      </span>
                      <StatusBadge status={feedback.status} />
                    </span>
                    {feedback.comment ? (
                      <span className="mt-0.5 line-clamp-1 block text-sm text-slate-600">
                        {feedback.comment}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDateTime(feedback.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
