"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireYazma } from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { prisma } from "@/lib/db";
import { FEEDBACK_STATUSES } from "@/lib/constants";
import { sendSms } from "@/lib/sms";
import { sendMail } from "@/lib/mailer";
import { yanitEngeli } from "@/lib/yanit";

export type UpdateState = { error?: string; saved?: boolean };

export type RespondState = { error?: string; sent?: boolean };

/** Müşteriye gönderilebilecek yanıtın en fazla uzunluğu (tek SMS'e sığsın). */
const MAX_RESPONSE = 480;

/**
 * Şikayet döngüsünü kapatır: müşteriye panelden SMS ya da e-posta gönderir.
 *
 * KVKK sınırı katı: müşteri "yalnızca bu geri bildirim hakkında bana dönülsün"
 * diye açık rıza verdiyse iletişim kurulabilir. Rıza yoksa, iletişim bilgisi
 * yoksa ya da saklama süresi dolup bilgi silindiyse yanıt açılmaz — bu kontrol
 * arayüzde de yapılıyor ama asıl kapı burası.
 */
export async function respondToCustomer(
  _prev: RespondState,
  formData: FormData,
): Promise<RespondState> {
  const user = await requireYazma();
  const id = String(formData.get("id") ?? "");
  const mesaj = String(formData.get("mesaj") ?? "").trim();

  if (!mesaj) return { error: "Boş mesaj gönderilemez." };
  if (mesaj.length > MAX_RESPONSE) {
    return { error: `Mesaj çok uzun (en fazla ${MAX_RESPONSE} karakter).` };
  }

  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) return { error: "Kayıt bulunamadı." };
  if (!(await canAccessBusiness(user, feedback.businessId))) {
    return { error: "Bu kayda erişim yetkiniz yok." };
  }

  // KVKK kapısı: rıza + iletişim bilgisi + bilgi hâlâ duruyor olmalı.
  // Kural src/lib/yanit.ts'te; arayüz de aynı kaynağı kullanıyor.
  const engel = yanitEngeli(feedback);
  if (engel) return { error: engel };
  // yanitEngeli null döndüyse contactInfo garanti dolu; TS'e yerel değişkenle
  // bunu bildiriyoruz.
  const hedef = feedback.contactInfo as string;
  const kanal = feedback.contactType === "eposta" ? "eposta" : "telefon";

  const sonuc =
    kanal === "eposta"
      ? await sendMail(hedef, "Geri bildiriminiz hakkında", mesaj)
      : await sendSms(hedef, mesaj);

  if (!sonuc.sent) {
    return {
      error:
        sonuc.error ??
        (kanal === "eposta" ? "E-posta gönderilemedi." : "SMS gönderilemedi."),
    };
  }

  const now = new Date();
  await prisma.feedback.update({
    where: { id },
    data: {
      respondedAt: now,
      responseText: mesaj,
      responseChannel: kanal,
      // Müşteriye dönüş yapıldıysa döngü kapanmış demektir; ilk çözülüş anını
      // damgalayıp durumu "çözüldü"ye çekiyoruz. Zaten çözülmüşse dokunmuyoruz.
      ...(feedback.status !== "cozuldu"
        ? { status: "cozuldu", statusChangedAt: now }
        : {}),
      ...(!feedback.resolvedAt ? { resolvedAt: now } : {}),
    },
  });

  await denetimYaz(user, "feedback.respond", {
    entity: "feedback",
    entityId: id,
    detail: `${kanal === "eposta" ? "E-posta" : "SMS"} ile yanıtlandı`,
  });

  revalidatePath(`/admin/geri-bildirimler/${id}`);
  revalidatePath("/admin/geri-bildirimler");
  revalidatePath("/admin");

  return { sent: true };
}

export async function updateFeedback(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const user = await requireYazma();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const internalNote = String(formData.get("internalNote") ?? "").slice(0, 2000);

  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) return { error: "Kayıt bulunamadı." };
  if (!await canAccessBusiness(user, feedback.businessId)) {
    return { error: "Bu kayda erişim yetkiniz yok." };
  }
  if (!(status in FEEDBACK_STATUSES)) {
    return { error: "Geçersiz durum." };
  }

  const statusChanged = status !== feedback.status;
  const now = new Date();

  await prisma.feedback.update({
    where: { id },
    data: {
      status,
      internalNote: internalNote || null,
      ...(statusChanged ? { statusChangedAt: now } : {}),
      // resolvedAt yalnızca ilk çözülüşte yazılır: kayıt tekrar açılıp
      // kapatılırsa yanıt süresi metriği bozulmasın.
      ...(status === "cozuldu" && !feedback.resolvedAt ? { resolvedAt: now } : {}),
    },
  });

  await denetimYaz(user, "feedback.status", {
    entity: "feedback",
    entityId: id,
    detail: statusChanged
      ? `${FEEDBACK_STATUSES[feedback.status as keyof typeof FEEDBACK_STATUSES] ?? feedback.status} → ${FEEDBACK_STATUSES[status as keyof typeof FEEDBACK_STATUSES]}`
      : "Dahili not güncellendi",
  });

  revalidatePath(`/admin/geri-bildirimler/${id}`);
  revalidatePath("/admin/geri-bildirimler");
  revalidatePath("/admin");

  return { saved: true };
}
