"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type PushKayitState = { error?: string; saved?: boolean };

/**
 * Tarayıcıdan gelen push aboneliğini kaydeder.
 *
 * `endpoint` tekil: aynı cihaz ikinci kez abone olursa (ör. izni kapatıp
 * tekrar açtı) eski satırın üstüne yazılır, kopya birikmez.
 */
export async function pushAboneOl(abonelik: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<PushKayitState> {
  const user = await requireUser();

  if (!abonelik.endpoint || !abonelik.keys?.p256dh || !abonelik.keys?.auth) {
    return { error: "Abonelik bilgisi eksik." };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: abonelik.endpoint },
    // Aynı endpoint başka bir kullanıcıya kayıtlıysa (ör. aynı cihazda
    // önce başka biri giriş yapmıştı) bu satır artık ONA değil, giriş
    // yapmış olan kişiye ait sayılmalı. `disabledAt: null` da şart:
    // daha önce kapatılmış bir cihaz yeniden abone olduğunda satır
    // canlanmalı, yoksa kullanıcı butona basar ama bildirim gelmez.
    update: {
      userId: user.id,
      p256dh: abonelik.keys.p256dh,
      auth: abonelik.keys.auth,
      disabledAt: null,
      disabledReason: null,
    },
    create: {
      userId: user.id,
      endpoint: abonelik.endpoint,
      p256dh: abonelik.keys.p256dh,
      auth: abonelik.keys.auth,
    },
  });

  return { saved: true };
}

/**
 * Bu cihazın aboneliğini kapatır — "Bildirimleri kapat" düğmesi ve çıkış.
 *
 * Satır silinmiyor, `disabledAt` işaretleniyor: "bildirim gelmiyor"
 * şikayetinde aboneliğin hiç açılmadığı mı, kullanıcının kendi mi
 * kapattığı mı, yoksa cihazın mı düştüğü ancak bu izle ayırt edilebilir.
 */
export async function pushAbonelikSil(
  endpoint: string,
  sebep = "Kullanıcı kapattı.",
): Promise<void> {
  const user = await requireUser();
  if (!endpoint) return;

  // Yalnızca kendi aboneliğini kapatabilir: başka bir kullanıcının cihaz
  // kaydını endpoint tahmin ederek susturamasın.
  await prisma.pushSubscription.updateMany({
    where: { endpoint, userId: user.id, disabledAt: null },
    data: { disabledAt: new Date(), disabledReason: sebep },
  });
}
