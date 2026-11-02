import { Bell, MessageSquare, Star, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireAnketErisim } from "@/lib/kimlik/auth";
import { yazabilirMi } from "@/lib/kimlik/session-token";
import { prisma } from "@/lib/cekirdek/db";
import { SHIFTS, type Shift } from "@/lib/cekirdek/constants";
import { CONTACT_RETENTION_DAYS } from "@/lib/isletme/kvkk";
import { detaylariCoz } from "@/lib/isletme/anket-detay";
import { yanitlanabilir } from "@/lib/cekirdek/yanit";
import { masaEtiketi } from "@/lib/isletme/masa";
import { noktaPuan, puanMetinRengi } from "../../OzetParcalari";
import { SectionCard, StatusBadge, formatDateTime, buttonClass } from "@/components/ui";
import { StatusForm } from "./StatusForm";
import { hazirYanitlar } from "@/lib/isletme/hazir-yanit";
import { RespondForm } from "./RespondForm";

export const dynamic = "force-dynamic";

/** Notification.channel değerlerinin okunur karşılıkları. */
const KANAL_ADLARI: Record<string, string> = {
  email: "E-posta",
  push: "Telefon",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

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

  // Bu kaydın durum/not geçmişi. Ayrı bir sayfaya (İşlem geçmişi) gitmeden
  // "kim, ne zaman, ne yaptı" burada görünsün diye — biri notu yazıp
  // gitti, saatler sonra bir başkası durumu değiştirdiyse ikisi de kendi
  // satırında kalıyor (bkz. actions.ts, updateFeedback).
  const gecmis = await prisma.auditLog.findMany({
    where: {
      entity: "feedback",
      entityId: id,
      action: { in: ["feedback.status", "feedback.note"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, actorName: true, detail: true, createdAt: true },
  });

  const ratings: Record<string, number> = feedback.categoryRatings
    ? JSON.parse(feedback.categoryRatings)
    : {};
  const sorunlar = detaylariCoz(feedback.problemDetails);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/geri-bildirimler"
        className={buttonClass({ variant: "secondary", size: "sm", className: "self-start" })}
      >
        <span aria-hidden="true">←</span>
        Geri bildirimler
      </Link>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* "Dosya" başlığı: puan büyük ve renginde, yer ve zaman mono.
              Yorum hemen altında alıntı olarak — sayfaya gelen kişinin
              asıl okumak istediği şey. */}
          <div className="flex flex-col gap-5 rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
          <header className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-line pb-5">
            <span
              className={`font-display text-[80px] leading-[0.8] font-bold tracking-[-0.05em] ${puanMetinRengi(feedback.overallRating)}`}
              aria-label={`${feedback.overallRating} / 5 puan`}
            >
              {feedback.overallRating}
              <span className="text-[26px] tracking-normal text-ink-faint">/5</span>
            </span>
            <div className="min-w-[200px] flex-1">
              <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                {feedback.table ? masaEtiketi(feedback.table) : "Masa belirtilmemiş"}
              </h1>
              <p className="mt-1 font-mono text-caption text-ink-faint">
                {formatDateTime(feedback.createdAt)}
                {feedback.shift ? ` · ${SHIFTS[feedback.shift as Shift]} vardiyası` : ""}
                {` · ${feedback.business.name}`}
                {feedback.redirectedToGoogle ? " · Google'a yönlendirildi" : ""}
              </p>
            </div>
            <StatusBadge status={feedback.status} />
          </header>

          <blockquote className="m-0 max-w-3xl font-display text-[22px] leading-snug font-normal tracking-[-0.01em] whitespace-pre-wrap text-ink">
            {feedback.comment ? (
              <>“{feedback.comment}”</>
            ) : (
              <span className="text-[16px] text-ink-faint">Müşteri yorum bırakmadı.</span>
            )}
          </blockquote>
          </div>

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
                      <span
                        className={`font-mono text-small tracking-[0.1em] ${puanMetinRengi(value)}`}
                        aria-label={`${value} / 5`}
                      >
                        {noktaPuan(value)}
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

          {/* Yorum artık başlığın altında alıntı olarak; bu kart ekleri ve
              iletişimi taşıyor. */}
          <SectionCard ikon={<MessageSquare className="h-4 w-4" aria-hidden="true" />} renk="sky" title="İletişim ve ekler">
            {feedback.photoUrl ? (
              <div className="mb-4">
                <h3 className="text-small font-medium text-ink-muted">
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
              <h3 className="text-small font-medium text-ink-muted">
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
                      hazirYanitlar={hazirYanitlar(
                        feedback.overallRating,
                        feedback.business.name,
                      )}
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

        <aside className="flex flex-col gap-4">
          <SectionCard ikon={<Tag className="h-4 w-4" aria-hidden="true" />} renk="indigo" title="Durum ve iç not">
            {/* Salt okunur kullanıcıya düzenleme formu gösterilmez: sunucu
                zaten reddediyor ama kapalı bir kapıya yönlendirmek kafa
                karıştırır. Durumu ve notu okunur halde gösteriyoruz. */}
            {yazabilirMi(user.role) ? (
              <StatusForm
                id={feedback.id}
                status={feedback.status}
                internalNote={feedback.internalNote}
                internalNoteBy={feedback.internalNoteBy}
                internalNoteAt={
                  feedback.internalNoteAt ? formatDateTime(feedback.internalNoteAt) : null
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-small font-medium text-ink-muted">
                    Durum
                  </span>
                  <div className="mt-2">
                    <StatusBadge status={feedback.status} />
                  </div>
                </div>
                <div>
                  <span className="text-small font-medium text-ink-muted">
                    İç not
                  </span>
                  <p className="mt-1 text-small whitespace-pre-wrap text-ink-soft">
                    {feedback.internalNote || (
                      <span className="text-ink-faint">Not eklenmemiş.</span>
                    )}
                  </p>
                  {feedback.internalNoteBy ? (
                    <p className="mt-1 text-caption text-ink-faint">
                      Son yazan:{" "}
                      <strong className="font-medium text-ink-soft">
                        {feedback.internalNoteBy}
                      </strong>
                      {feedback.internalNoteAt
                        ? ` — ${formatDateTime(feedback.internalNoteAt)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <p className="text-caption text-ink-faint">
                  Hesabınız salt okunur; durum ve notu değiştiremezsiniz.
                </p>
              </div>
            )}

            {/* Durum ve not ayrı olaylar, bilerek ayrı satırlarda: biri
                notu yazıp gitti, saatler sonra bir başkası durumu
                değiştirdiyse ikisi de burada kendi zaman damgasıyla
                kalıyor — tek bir "son işlem" alanı ikinciyi birinciyi
                sildiği için yetersizdi. */}
            {gecmis.length > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <span className="text-small font-medium text-ink-muted">
                  Geçmiş
                </span>
                <ul className="mt-2 flex flex-col gap-2">
                  {gecmis.map((kayit) => (
                    <li key={kayit.id} className="text-small">
                      <span className="text-ink-soft">{kayit.detail}</span>
                      <span className="ml-1.5 text-caption text-ink-faint">
                        — {kayit.actorName}, {formatDateTime(kayit.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            ikon={<Bell className="h-4 w-4" aria-hidden="true" />}
            renk="slate"
            title="Bildirimler"
            description="Bu kayıt için gönderilen uyarılar."
          >
            {feedback.notifications.length === 0 ? (
              <p className="text-small text-ink-faint">
                Bu kayıt için bildirim gönderilmedi (puan eşiğin üstünde).
              </p>
            ) : (
              <ul className="space-y-2 text-small">
                {feedback.notifications.map((notification) => (
                  <li key={notification.id}>
                    {/* Aynı kişiye hem e-posta hem push gidebiliyor; kanal
                        yazmazsak iki satır birbirinin kopyası gibi görünür. */}
                    <span className="mr-1.5 text-caption text-ink-faint">
                      {KANAL_ADLARI[notification.channel] ?? notification.channel}
                    </span>
                    <span className="text-ink-soft">{notification.recipient}</span>
                    {notification.sentAt ? (
                      <span className="ml-2 text-caption text-success">
                        gönderildi · {formatDateTime(notification.sentAt)}
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-caption font-medium text-danger-ink"
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
