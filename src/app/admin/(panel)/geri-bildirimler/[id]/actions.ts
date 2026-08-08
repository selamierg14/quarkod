"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FEEDBACK_STATUSES } from "@/lib/constants";

export type UpdateState = { error?: string; saved?: boolean };

export async function updateFeedback(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const user = await requireUser();
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

  revalidatePath(`/admin/geri-bildirimler/${id}`);
  revalidatePath("/admin/geri-bildirimler");
  revalidatePath("/admin");

  return { saved: true };
}
