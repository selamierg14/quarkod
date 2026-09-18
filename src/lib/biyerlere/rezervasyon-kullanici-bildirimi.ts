import "server-only";
import { prisma } from "../cekirdek/db";
import { expoyaGonder, pushMesajiOlustur } from "./app-push";

/**
 * Rezervasyonun sonucunu KULLANICIYA bildirir.
 *
 * Uygulama talep gönderilirken "mekan onayladığında haber vereceğiz"
 * diyor; bu dosya o sözü tutuyor. Olmadığında kullanıcının tek seçeneği
 * uygulamayı tekrar tekrar açıp bakmak olurdu — ve çoğu insan bakmaz,
 * mekana onaysız gider.
 *
 * BU BİLDİRİM KAPATILAMIYOR (bkz. lib/biyerlere/bildirim-tercihi.ts):
 * kişinin kendi başlattığı bir işlemin sonucu, pazarlama değil.
 *
 * Push gitmezse (izin yok, jeton çürümüş, VAPID/Expo erişilemiyor)
 * bildirim uygulama içi akışta zaten duruyor (api/app/bildirimler) —
 * iki kanal birbirinin yerine geçmiyor, üst üste biniyor.
 */
export async function rezervasyonSonucunuBildir(rezervasyonId: string): Promise<void> {
  try {
    const kayit = await prisma.rezervasyon.findUnique({
      where: { id: rezervasyonId },
      select: {
        durum: true,
        baslangic: true,
        kanal: true,
        appUserId: true,
        business: { select: { name: true, slug: true } },
      },
    });

    // Yalnızca uygulamadan gelen ve hâlâ bir sahibi olan talepler.
    if (!kayit || kayit.kanal !== "biyerlere" || !kayit.appUserId) return;
    if (kayit.durum !== "onaylandi" && kayit.durum !== "iptal") return;

    const abonelikler = (
      await prisma.appPushSubscription.findMany({
        where: { appUserId: kayit.appUserId, disabledAt: null },
        select: { expoToken: true },
      })
    ).filter((a): a is { expoToken: string } => Boolean(a.expoToken));
    if (abonelikler.length === 0) return;

    const saat = kayit.baslangic.toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    const baslik =
      kayit.durum === "onaylandi"
        ? `✅ Rezervasyonun onaylandı`
        : `Rezervasyonun iptal edildi`;
    const govde =
      kayit.durum === "onaylandi"
        ? `${kayit.business.name} · ${saat}. Görüşmek üzere!`
        : `${kayit.business.name} · ${saat}. Ayrıntı için mekanı arayabilirsin.`;

    const { gecersizJetonlar } = await expoyaGonder(
      abonelikler.map((a) =>
        pushMesajiOlustur(a.expoToken, baslik, govde, { slug: kayit.business.slug }),
      ),
    );

    if (gecersizJetonlar.length > 0) {
      await prisma.appPushSubscription.updateMany({
        where: { expoToken: { in: gecersizJetonlar } },
        data: { disabledAt: new Date(), disabledReason: "cihaz-kayitli-degil" },
      });
    }
  } catch (error) {
    // Bildirim, durum değişikliğinin yan etkisi: gönderilemezse panel
    // işlemi yine de tamamlanmalı.
    console.error("[rezervasyon] kullanıcı bildirimi gönderilemedi:", error);
  }
}
