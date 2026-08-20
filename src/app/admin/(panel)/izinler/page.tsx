import { allowedBusinessIds, requireTenantOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, formatDateTime } from "@/components/ui";
import { IYS_CHANNELS, type IysChannel } from "@/lib/iys";
import { MarkReportedForm } from "./MarkReportedForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pazarlama izinleri" };

export default async function ConsentsPage() {
  const user = await requireTenantOwner();
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
      <PageHeader
        ikon="✉️"
        renk="emerald"
        title="Pazarlama izinleri"
        description={
          <>
            Ankette ticari elektronik ileti kutusunu işaretleyen müşteriler. Bu
            liste, geri bildirim için alınan KVKK rızasından ayrıdır — buradaki
            kayıtlar İYS&apos;ye bildirilmek üzere tutulur.
          </>
        }
      />

      {bekleyen > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-warning-soft px-4 py-3">
          <p className="text-small text-warning-ink">
            <span className="font-medium">{bekleyen} izin</span> henüz
            İYS&apos;ye bildirilmedi. Mevzuat izinlerin kısa sürede
            bildirilmesini istiyor — dosyayı indirip İYS panelinize yükleyin.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/izinler/disa-aktar"
              className="rounded-chip bg-ink px-3 py-1.5 text-small font-medium text-white"
            >
              Bekleyenleri indir
            </a>
            <MarkReportedForm bekleyen={bekleyen} />
          </div>
        </div>
      ) : consents.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-success-soft px-4 py-3">
          <p className="text-small text-emerald-800">
            Tüm izinler İYS&apos;ye bildirildi olarak işaretli.
          </p>
          <a
            href="/admin/izinler/disa-aktar?kapsam=hepsi"
            className="rounded-chip border border-emerald-200 bg-surface px-3 py-1.5 text-small text-ink-soft"
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
        <div className="overflow-x-auto rounded-control bg-surface ring-1 ring-line">
          <table className="w-full min-w-[720px] text-small">
            <thead className="border-b border-line text-left text-caption tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Alıcı</th>
                <th className="px-4 py-3 font-medium">Kanal</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">İşletme</th>
                <th className="px-4 py-3 font-medium">İzin tarihi</th>
                <th className="px-4 py-3 font-medium">İYS</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {consents.map((consent) => (
                <tr key={consent.id}>
                  <td className="px-4 py-3 font-medium tabular">
                    {consent.recipient}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {IYS_CHANNELS[consent.channel as IysChannel] ?? consent.channel}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-caption font-medium ring-1 ${
                        consent.status === "ONAY"
                          ? "bg-success-soft text-success-ink ring-success/20"
                          : "bg-sunken text-ink-soft ring-line"
                      }`}
                    >
                      {consent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: consent.business.brandColor }}
                      />
                      {consent.business.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                    {formatDateTime(consent.consentAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {consent.reportedAt ? (
                      <span
                        className="text-caption text-success"
                        title={consent.iysTransactionId ?? undefined}
                      >
                        bildirildi · {formatDateTime(consent.reportedAt)}
                      </span>
                    ) : (
                      <span className="text-caption text-rating">bekliyor</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a
                      href={`/admin/izinler/${consent.id}/kanit`}
                      className="text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
                    >
                      Kanıt indir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-caption text-ink-faint">
        Dosyanın sütun adları İYS alan adlarıyla birebir aynıdır: recipient,
        type, recipientType, status, consentDate, source.
      </p>
    </div>
  );
}
