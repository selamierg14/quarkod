import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP taşıyıcısı. Hem uygulama (bildirimler) hem komut satırı betikleri
 * (haftalık rapor) buradan geçer — bu yüzden "server-only" işareti yok.
 */

let cached: Transporter | null | undefined;

/** SMTP ayarlanmamışsa null döner; çağıran taraf konsola düşer. */
export function getTransport(): Transporter | null {
  if (cached !== undefined) return cached;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    cached = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

export type SendResult = { sent: boolean; error?: string };

export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  const transport = getTransport();

  if (!transport) {
    console.warn(`[posta] SMTP ayarlanmamış — ${to} adresine gönderilemedi.\n${subject}\n${text}`);
    return {
      sent: false,
      error: "SMTP yapılandırılmamış (.env içindeki SMTP_* alanları boş)",
    };
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[posta] Gönderilemedi (${to}): ${message}`);
    return { sent: false, error: message };
  }
}

export function starLine(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}
