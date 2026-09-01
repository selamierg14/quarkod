"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
}> {
  const user = await requireUser();

  const [unread, items] = await Promise.all([
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
  ]);

  return {
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
