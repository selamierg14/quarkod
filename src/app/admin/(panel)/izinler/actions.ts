"use server";

import { revalidatePath } from "next/cache";
import { allowedBusinessIds, requireOwner, requireYazma } from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { prisma } from "@/lib/db";

/**
 * Bekleyen izinleri "İYS'ye bildirildi" olarak işaretler.
 *
 * Dışa aktarma varsayılan olarak yalnızca bildirilmemiş kayıtları indirir;
 * bu işaretleme olmadan o filtre hiç değişmez ve her seferinde aynı kayıtlar
 * yeniden inerdi. İYS panelinden yüklemeyi yapan kişi dönüp buradan işaretler.
 */
export async function markReported(formData: FormData) {
  const user = await requireOwner();
  await requireYazma();
  const ids = await allowedBusinessIds(user);
  const transactionId = String(formData.get("transactionId") ?? "").trim();

  await prisma.marketingConsent.updateMany({
    where: { businessId: { in: ids }, reportedAt: null },
    data: {
      reportedAt: new Date(),
      iysTransactionId: transactionId || null,
    },
  });

  await denetimYaz(user, "consent.reported", {
    detail: transactionId
      ? `İYS'ye bildirildi (işlem: ${transactionId})`
      : "İYS'ye bildirildi",
  });

  revalidatePath("/admin/izinler");
}
