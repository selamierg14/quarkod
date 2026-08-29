import "server-only";
import { prisma } from "./db";
import { postaAktifMi, sendMail, starLine } from "./mailer";
import { kullanicilaraPushGonder, vapidHazirMi } from "./push";

/**
 * Eşik altı puan geldiğinde ilgili işletme sorumlusuna ve patrona haber verir.
 * Gönderim başarısız olsa bile geri bildirim kaydı korunur; her deneme
 * Notification tablosuna işlenir.
 *
 * İki kanal birbirinden bağımsız: e-posta SMTP_* ayarlıysa, push ise
 * VAPID_* ayarlıysa çalışır. Biri kapalı diye diğeri de kapanmasın diye
 * (ör. push açık ama SMTP hiç kurulmamış bir hesapta) erken bir "ikisi de
 * kapalıysa çık" yerine her kanal kendi aktiflik kontrolünü kendi yapıyor.
 */
export async function notifyLowRating(feedbackId: string): Promise<void> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { business: true, table: true },
  });
  if (!feedback) return;

  if (feedback.overallRating > feedback.business.notifyThreshold) return;

  // Bildirim YALNIZCA bu işletmenin hesabına gider. Hesap koşulu olmadan
  // "role: owner" filtresi bütün kiracıların sahiplerini kapsar ve bir kafenin
  // şikayeti başka bir kafenin sahibine gönderilirdi.
  const users = await prisma.user.findMany({
    where: {
      active: true,
      accountId: feedback.business.accountId,
      OR: [
        { role: "owner" },
        { role: "manager", businessId: feedback.businessId },
      ],
    },
  });
  if (users.length === 0) return;

  const categoryRatings = feedback.categoryRatings
    ? (JSON.parse(feedback.categoryRatings) as Record<string, number>)
    : {};

  const konum = feedback.table
    ? feedback.table.isEntrance
      ? "Giriş"
      : `Masa ${feedback.table.tableNumber}`
    : "Belirtilmemiş";

  const panelAdresi = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/geri-bildirimler/${feedback.id}`;

  if (postaAktifMi()) {
    const subject = `[${feedback.business.name}] Düşük puan: ${feedback.overallRating}/5 — ${konum}`;
    const text = [
      `İşletme: ${feedback.business.name}`,
      `Konum: ${konum}`,
      `Genel puan: ${starLine(feedback.overallRating)} (${feedback.overallRating}/5)`,
      "",
      ...Object.entries(categoryRatings).map(
        ([name, value]) => `  ${name}: ${value}/5`,
      ),
      "",
      feedback.comment ? `Yorum: ${feedback.comment}` : "Yorum bırakılmamış.",
      feedback.contactInfo
        ? `İletişim (açık rıza alındı): ${feedback.contactInfo}`
        : "İletişim bilgisi bırakılmamış.",
      "",
      `Tarih: ${feedback.createdAt.toLocaleString("tr-TR")}`,
      `Panel: ${panelAdresi}`,
    ].join("\n");

    for (const user of users) {
      const record = await prisma.notification.create({
        data: { feedbackId: feedback.id, channel: "email", recipient: user.email },
      });

      const result = await sendMail(user.email, subject, text);

      await prisma.notification.update({
        where: { id: record.id },
        data: result.sent ? { sentAt: new Date() } : { error: result.error },
      });
    }
  }

  // Push kısa ve tek amaçlı: tam metin e-postada, burada yalnızca "bir şey
  // oldu, bak" bilgisi + doğrudan o kayda giden bir bağlantı yeterli.
  if (vapidHazirMi()) {
    const gonderimler = await kullanicilaraPushGonder(
      users.map((user) => user.id),
      {
        baslik: `${feedback.business.name} — ${feedback.overallRating}/5 ⭐`,
        govde: feedback.comment
          ? feedback.comment.slice(0, 120)
          : `${konum} — yorum bırakılmamış.`,
        url: panelAdresi,
      },
    );

    for (const user of users) {
      const gonderilen = gonderimler.get(user.id);
      // Haritada hiç yoksa o kullanıcının açık bir cihazı yok. Bunun için
      // "gönderilemedi" kaydı açmak yanlış olurdu: panelde her düşük puanın
      // altında kalıcı bir sahte alarm birikir, gerçek arıza da onun içinde
      // kaybolurdu. Push'u hiç açmamak bir hata değil, bir tercih.
      if (gonderilen === undefined) continue;

      await prisma.notification.create({
        data: {
          feedbackId: feedback.id,
          channel: "push",
          // E-posta kanalıyla aynı biçim: panelde bu alan olduğu gibi
          // ekrana basılıyor, ham kullanıcı kimliği okunabilir değil.
          recipient: user.email,
          sentAt: gonderilen > 0 ? new Date() : null,
          error: gonderilen > 0 ? null : "Kayıtlı cihazların hiçbirine ulaşılamadı.",
        },
      });
    }
  }
}
