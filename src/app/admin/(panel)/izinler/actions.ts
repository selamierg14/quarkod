"use server";

import { revalidatePath } from "next/cache";
import { allowedBusinessIds, requireOwner } from "@/lib/auth";
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
  const ids = await allowedBusinessIds(user);
  const transactionId = String(formData.get("transactionId") ?? "").trim();

  await prisma.marketingConsent.updateMany({
    where: { businessId: { in: ids }, reportedAt: null },
    data: {
      reportedAt: new Date(),
      iysTransactionId: transactionId || null,
    },
  });

  revalidatePath("/admin/izinler");
}
