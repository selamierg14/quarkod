import { Bell, MessageSquare, Star, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireAnketErisim } from "@/lib/auth";
import { yazabilirMi } from "@/lib/session-token";
import { prisma } from "@/lib/db";
import { SHIFTS, type Shift } from "@/lib/constants";
import { CONTACT_RETENTION_DAYS } from "@/lib/kvkk";
import { detaylariCoz } from "@/lib/anket-detay";
import { yanitlanabilir } from "@/lib/yanit";
import { SectionCard, StatusBadge, Stars, formatDateTime } from "@/components/ui";
import { StatusForm } from "./StatusForm";
import { RespondForm } from "./RespondForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Geri bildirim detayı" };

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnketErisim();
  const { id } = await params;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      business: true,
      table: true,
      notifications: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!feedback || !await canAccessBusiness(user, feedback.businessId)) notFound();

  const ratings: Record<string, number> = feedback.categoryRatings
    ? JSON.parse(feedback.categoryRatings)
    : {};
  const sorunlar = detaylariCoz(feedback.problemDetails);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/geri-bildirimler"
        className="inline-flex w-fit items-center gap-1.5 self-start rounded-control border border-line bg-surface px-3 py-1.5 text-small font-medium text-ink-soft shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:text-ink"
      >
        <span aria-hidden="true">←</span>
        Geri bildirimler
      </Link>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
            {/* İşletmenin marka rengi kartın tepesinde: zincirde çalışan
                sorumlu, hangi şubenin kaydına baktığını yazıyı okumadan
                anlıyor. */}
            <span
              aria-hidden="true"
              className="block h-1.5 w-full"
              style={{ backgroundColor: feedback.business.brandColor }}
            />
            <div className="p-5">
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
              <span className="text-lg font-semibold tabular">
                {feedback.overallRating}/5
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-small sm:grid-cols-4">
              <div>
                <dt className="text-caption text-ink-faint uppercase">Tarih</dt>
                <dd>{formatDateTime(feedback.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-faint uppercase">Konum</dt>
                <dd>
                  {feedback.table
                    ? feedback.table.isEntrance
                      ? "Giriş"
                      : `Masa ${feedback.table.tableNumber}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-ink-faint uppercase">Vardiya</dt>
                <dd>{feedback.shift ? SHIFTS[feedback.shift as Shift] : "—"}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-faint uppercase">Google</dt>
                <dd>{feedback.redirectedToGoogle ? "Yönlendirildi" : "—"}</dd>
              </div>
            </dl>
            </div>
          </section>

          {Object.keys(ratings).length > 0 ? (
            <SectionCard
              ikon={<Star className="h-4 w-4" aria-hidden="true" />}
              renk="amber"
              title="Kategori puanları"
              description="Kırmızı etiketler müşterinin işaretlediği somut sorun."
            >
              <ul className="-my-2 divide-y divide-line">
                {Object.entries(ratings).map(([name, value]) => (
                  <li key={name} className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-small text-ink-soft">{name}</span>
                      <span className="flex items-center gap-2">
                        <Stars value={value} />
                        <span className="w-8 text-right text-small tabular text-ink-muted">
                          {value}/5
                        </span>
                      </span>
                    </div>

                    {/* Asıl iş burada: "Temizlik 1/5" değil, "Temizlik →
                        Tuvaletler". Sorumluyu doğru yere gönderen satır. */}
                    {sorunlar[name]?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {sorunlar[name].map((alan) => (
                          <span
                            key={alan}
                            className="rounded-full bg-danger-soft px-2.5 py-0.5 text-caption font-medium text-danger-ink"
                          >
                            {alan}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard ikon={<MessageSquare className="h-4 w-4" aria-hidden="true" />} renk="sky" title="Müşteri yorumu">
            <p className="text-body whitespace-pre-wrap text-ink-strong">
              {feedback.comment ?? (
                <span className="text-ink-faint">Yorum bırakılmamış.</span>
              )}
            </p>

            {feedback.photoUrl ? (
              <div className="mt-4">
                <h3 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                  Müşterinin eklediği fotoğraf
                </h3>
                {/* Yeni sekmede tam boy açılsın: tabaktaki ayrıntı küçük
                    önizlemede seçilmiyor. */}
                <a
                  href={feedback.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block w-fit"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={feedback.photoUrl}
                    alt="Müşterinin geri bildirimine eklediği fotoğraf"
                    className="max-h-72 rounded-control ring-1 ring-line"
                  />
                </a>
                <p className="mt-1 text-caption text-ink-faint">
                  KVKK saklama süresi dolduğunda iletişim bilgisiyle birlikte silinir.
                </p>
              </div>
            ) : null}

            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
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
                    className="text-body font-medium text-ink underline underline-offset-2"
                  >
                    {feedback.contactInfo}
                  </a>
                  <p className="mt-1 text-caption text-success">
                    Açık rıza alındı
                    {feedback.consentAt
                      ? ` · ${formatDateTime(feedback.consentAt)}`
                      : ""}
                    {feedback.consentVersion ? ` · metin ${feedback.consentVersion}` : ""}
                    {" · "}
                    <a
                      href={`/admin/geri-bildirimler/${feedback.id}/kanit`}
                      className="underline underline-offset-2"
                    >
                      kanıt indir
                    </a>
                  </p>
                  <p className="mt-0.5 text-caption text-ink-faint">
                    {CONTACT_RETENTION_DAYS} gün sonra otomatik silinir.
                  </p>

                  {/* Şikayet döngüsünü kapatan yanıt kutusu: yalnızca yazma
                      yetkisi olan kullanıcıya ve KVKK kuralı izin verdiğinde
                      (rıza + iletişim + silinmemiş). Sunucu koşulu yeniden
                      denetliyor. */}
                  {yazabilirMi(user.role) && yanitlanabilir(feedback) ? (
                    <RespondForm
                      id={feedback.id}
                      channel={feedback.contactType === "eposta" ? "eposta" : "telefon"}
                      alreadyResponded={Boolean(feedback.respondedAt)}
                    />
                  ) : null}
                </div>
              ) : feedback.contactErasedAt ? (
                <p className="mt-1 text-small text-ink-faint">
                  İletişim bilgisi saklama süresi dolduğu için silindi (
                  {formatDateTime(feedback.contactErasedAt)}).
                </p>
              ) : (
                <p className="mt-1 text-small text-ink-faint">
                  Müşteri iletişim bilgisi bırakmamış.
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-5">
          <SectionCard ikon={<Tag className="h-4 w-4" aria-hidden="true" />} renk="indigo" title="Durum ve iç not">
            {/* Salt okunur kullanıcıya düzenleme formu gösterilmez: sunucu
                zaten reddediyor ama kapalı bir kapıya yönlendirmek kafa
                karıştırır. Durumu ve notu okunur halde gösteriyoruz. */}
            {yazabilirMi(user.role) ? (
              <StatusForm
                id={feedback.id}
                status={feedback.status}
                internalNote={feedback.internalNote}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                    Durum
                  </span>
                  <div className="mt-2">
                    <StatusBadge status={feedback.status} />
                  </div>
                </div>
                <div>
                  <span className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                    İç not
                  </span>
                  <p className="mt-1 text-small whitespace-pre-wrap text-ink-soft">
                    {feedback.internalNote || (
                      <span className="text-ink-faint">Not eklenmemiş.</span>
                    )}
                  </p>
                </div>
                <p className="text-caption text-ink-faint">
                  Hesabınız salt okunur; durum ve notu değiştiremezsiniz.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            ikon={<Bell className="h-4 w-4" aria-hidden="true" />}
            renk="slate"
            title="Bildirimler"
            description="Bu kayıt için gönderilen uyarı e-postaları."
          >
            {feedback.notifications.length === 0 ? (
              <p className="text-small text-ink-faint">
                Bu kayıt için bildirim gönderilmedi (puan eşiğin üstünde).
              </p>
            ) : (
              <ul className="space-y-2 text-small">
                {feedback.notifications.map((notification) => (
                  <li key={notification.id}>
                    <span className="text-ink-soft">{notification.recipient}</span>
                    {notification.sentAt ? (
                      <span className="ml-2 text-caption text-success">
                        gönderildi · {formatDateTime(notification.sentAt)}
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-caption text-rating"
                        title={notification.error ?? ""}
                      >
                        gönderilemedi
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
