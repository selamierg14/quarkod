import { allowedBusinessIds, requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, formatDateTime } from "@/components/ui";
import { IYS_CHANNELS, type IysChannel } from "@/lib/iys";
import { MarkReportedForm } from "./MarkReportedForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "İleti izinleri" };

export default async function ConsentsPage() {
  const user = await requireOwner();
  const ids = await allowedBusinessIds(user);

  const [consents, bekleyen] = await Promise.all([
    prisma.marketingConsent.findMany({
      where: { businessId: { in: ids } },
      orderBy: [{ reportedAt: "asc" }, { consentAt: "desc" }],
      include: { business: { select: { name: true, brandColor: true } } },
      take: 500,
    }),
    prisma.marketingConsent.count({
      where: { businessId: { in: ids }, reportedAt: null },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">İleti izinleri</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ankette ticari elektronik ileti kutusunu işaretleyen müşteriler. Bu
          liste, geri bildirim için alınan KVKK rızasından ayrıdır — buradaki
          kayıtlar İYS&apos;ye bildirilmek üzere tutulur.
        </p>
      </div>

      {bekleyen > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{bekleyen} izin</span> henüz
            İYS&apos;ye bildirilmedi. Mevzuat izinlerin kısa sürede
            bildirilmesini istiyor — dosyayı indirip İYS panelinize yükleyin.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/izinler/disa-aktar"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Bekleyenleri indir
            </a>
            <MarkReportedForm bekleyen={bekleyen} />
          </div>
        </div>
      ) : consents.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            Tüm izinler İYS&apos;ye bildirildi olarak işaretli.
          </p>
          <a
            href="/admin/izinler/disa-aktar?kapsam=hepsi"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-slate-600"
          >
            Tümünü indir
          </a>
        </div>
      ) : null}

      {consents.length === 0 ? (
        <EmptyState>
          Henüz ticari ileti izni veren olmadı. Müşteri ankette telefon veya
          e-posta bıraktığında, altındaki ayrı kutuyu işaretlerse burada
          görünür.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Alıcı</th>
                <th className="px-4 py-3 font-medium">Kanal</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">İşletme</th>
                <th className="px-4 py-3 font-medium">İzin tarihi</th>
                <th className="px-4 py-3 font-medium">İYS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consents.map((consent) => (
                <tr key={consent.id}>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {consent.recipient}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {IYS_CHANNELS[consent.channel as IysChannel] ?? consent.channel}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                        consent.status === "ONAY"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {consent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: consent.business.brandColor }}
                      />
                      {consent.business.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {formatDateTime(consent.consentAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {consent.reportedAt ? (
                      <span
                        className="text-xs text-emerald-600"
                        title={consent.iysTransactionId ?? undefined}
                      >
                        bildirildi · {formatDateTime(consent.reportedAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600">bekliyor</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Dosyanın sütun adları İYS alan adlarıyla birebir aynıdır: recipient,
        type, recipientType, status, consentDate, source.
      </p>
    </div>
  );
}
