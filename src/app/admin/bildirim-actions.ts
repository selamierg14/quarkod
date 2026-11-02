"use server";

import { requireUser } from "@/lib/kimlik/auth";
import { effectiveAccountId } from "@/lib/kimlik/impersonation";
import { prisma } from "@/lib/cekirdek/db";
import { platformUyarilari, type PlatformUyarisi } from "@/lib/rapor/platform-uyarilari";

export type BildirimOzet = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
};

/**
 * Zil dropdown'ının verisi. Server Action olarak tasarlandı (route handler
 * değil): panel zaten her yerde bu deseni kullanıyor, ayrıca auth kontrolü
 * `requireUser()` üzerinden tek satırda geliyor.
 */
export async function bildirimlerimiGetir(): Promise<{
  unread: number;
  items: BildirimOzet[];
  /**
   * Yalnızca platform görünümündeki superadmin için: sistem hataları,
   * süresi dolan abonelikler. Kayıtlı bildirim DEĞİL — sorun düzelince
   * kendiliğinden kayboluyor, "okundu" işaretlenemiyor (okundu demek onu
   * çözmüyor). UI incelemesi zilin "ne gösterdiği belli değil" dedi;
   * yöneticinin asıl bakması gerekenler burada sayılı rozetle duruyor.
   */
  uyarilar: PlatformUyarisi[];
}> {
  const user = await requireUser();
  const platformda = user.role === "superadmin" && !(await effectiveAccountId(user));

  const [unread, items, uyarilar] = await Promise.all([
    prisma.panelNotification.count({ where: { userId: user.id, read: false } }),
    prisma.panelNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        read: true,
        createdAt: true,
      },
    }),
    platformda ? platformUyarilari() : Promise.resolve([]),
  ]);

  return {
    uyarilar,
    unread,
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function bildirimOku(id: string): Promise<void> {
  const user = await requireUser();
  // updateMany + userId şartı: id'yi tahmin eden biri başkasının bildirimini
  // okundu işaretleyemesin.
  await prisma.panelNotification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
}

export async function tumBildirimleriOku(): Promise<void> {
  const user = await requireUser();
  await prisma.panelNotification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}
