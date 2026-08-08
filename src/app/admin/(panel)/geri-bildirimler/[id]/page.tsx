import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SHIFTS, type Shift } from "@/lib/constants";
import { CONTACT_RETENTION_DAYS } from "@/lib/kvkk";
import { StatusBadge, Stars, formatDateTime } from "@/components/ui";
import { StatusForm } from "./StatusForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Geri bildirim detayı" };

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      business: true,
      table: true,
      notifications: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!feedback || !canAccessBusiness(user, feedback.businessId)) notFound();

  const ratings: Record<string, number> = feedback.categoryRatings
    ? JSON.parse(feedback.categoryRatings)
    : {};

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/geri-bildirimler"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Geri bildirimler
      </Link>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: feedback.business.brandColor }}
                />
                {feedback.business.name}
              </span>
              <StatusBadge status={feedback.status} />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Stars value={feedback.overallRating} className="text-2xl" />
              <span className="text-lg font-semibold tabular-nums">
                {feedback.overallRating}/5
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-400 uppercase">Tarih</dt>
                <dd>{formatDateTime(feedback.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">Konum</dt>
                <dd>
                  {feedback.table
                    ? feedback.table.isEntrance
                      ? "Giriş"
                      : `Masa ${feedback.table.tableNumber}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">Vardiya</dt>
                <dd>{feedback.shift ? SHIFTS[feedback.shift as Shift] : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">Google</dt>
                <dd>{feedback.redirectedToGoogle ? "Yönlendirildi" : "—"}</dd>
              </div>
            </dl>
          </section>

          {Object.keys(ratings).length > 0 ? (
            <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Kategori puanları
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {Object.entries(ratings).map(([name, value]) => (
                  <li key={name} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-700">{name}</span>
                    <span className="flex items-center gap-2">
                      <Stars value={value} />
                      <span className="w-8 text-right text-sm tabular-nums text-slate-500">
                        {value}/5
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Müşteri yorumu
            </h2>
            <p className="mt-2 text-[15px] whitespace-pre-wrap text-slate-800">
              {feedback.comment ?? (
                <span className="text-slate-400">Yorum bırakılmamış.</span>
              )}
            </p>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                İletişim
              </h3>
              {feedback.contactInfo ? (
                <div className="mt-1">
                  <a
                    href={
                      feedback.contactType === "eposta"
                        ? `mailto:${feedback.contactInfo}`
                        : `tel:${feedback.contactInfo.replace(/\s/g, "")}`
                    }
                    className="text-[15px] font-medium text-slate-900 underline underline-offset-2"
                  >
                    {feedback.contactInfo}
                  </a>
                  <p className="mt-1 text-xs text-emerald-600">
                    Açık rıza alındı
                    {feedback.consentAt
                      ? ` · ${formatDateTime(feedback.consentAt)}`
                      : ""}
                    {feedback.consentVersion ? ` · metin ${feedback.consentVersion}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {CONTACT_RETENTION_DAYS} gün sonra otomatik silinir.
                  </p>
                </div>
              ) : feedback.contactErasedAt ? (
                <p className="mt-1 text-sm text-slate-400">
                  İletişim bilgisi saklama süresi dolduğu için silindi (
                  {formatDateTime(feedback.contactErasedAt)}).
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-400">
                  Müşteri iletişim bilgisi bırakmamış.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <StatusForm
              id={feedback.id}
              status={feedback.status}
              internalNote={feedback.internalNote}
            />
          </section>

          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Bildirimler
            </h2>
            {feedback.notifications.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                Bu kayıt için bildirim gönderilmedi (puan eşiğin üstünde).
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {feedback.notifications.map((notification) => (
                  <li key={notification.id}>
                    <span className="text-slate-700">{notification.recipient}</span>
                    {notification.sentAt ? (
                      <span className="ml-2 text-xs text-emerald-600">
                        gönderildi · {formatDateTime(notification.sentAt)}
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-xs text-amber-600"
                        title={notification.error ?? ""}
                      >
                        gönderilemedi
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
