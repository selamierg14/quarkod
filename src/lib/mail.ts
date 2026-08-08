import "server-only";
import { prisma } from "./db";
import { sendMail, starLine } from "./mailer";

/**
 * Eşik altı puan geldiğinde ilgili işletme sorumlusuna ve patrona haber verir.
 * Gönderim başarısız olsa bile geri bildirim kaydı korunur; her deneme
 * Notification tablosuna işlenir.
 */
export async function notifyLowRating(feedbackId: string): Promise<void> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { business: true, table: true },
  });
  if (!feedback) return;

  if (feedback.overallRating > feedback.business.notifyThreshold) return;

  const users = await prisma.user.findMany({
    where: {
      active: true,
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
    `Panel: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/geri-bildirimler/${feedback.id}`,
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
