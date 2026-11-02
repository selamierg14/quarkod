import "server-only";
import { prisma } from "../cekirdek/db";
import { bildirimGonder } from "../altyapi/bildirim";

/**
 * Uygulamadan gelen rezervasyon talebini işletmeye duyurur.
 *
 * Bu olmadan özellik çalışmaz: talep "bekliyor" durumunda açılıyor ve
 * onayı işletme veriyor — kimse haberdar olmazsa müşteri onay bekleyerek
 * kalır, masa da boşuna tutulur. Panelin zili ve (kurulduysa) push aynı
 * çağrıdan gidiyor (bkz. lib/altyapi/bildirim.ts).
 *
 * ALICILAR mail.ts'teki düşük puan bildirimiyle aynı kuralla seçiliyor:
 * hesabın sahipleri ve YALNIZCA o işletmenin sorumlusu. Hesap koşulu
 * olmadan "role: owner" filtresi bütün kiracıların sahiplerini kapsar ve
 * bir kafenin rezervasyonu başka bir kafenin sahibine düşerdi.
 *
 * Gönderim hatası talebi BOZMUYOR: kayıt zaten yazıldı, bildirim onun
 * yan etkisi. Panelde rezervasyon listesi her hâlükârda talebi gösteriyor.
 */
export async function rezervasyonTalebiBildir(girdi: {
  rezervasyonId: string;
  businessId: string;
  accountId: string;
  mekanAdi: string;
  misafirAdi: string;
  kisiSayisi: number;
  baslangic: Date;
}): Promise<void> {
  try {
    const kullanicilar = await prisma.user.findMany({
      where: {
        active: true,
        accountId: girdi.accountId,
        OR: [
          { role: "owner" },
          { role: "manager", businessId: girdi.businessId },
        ],
        // Modülü olmayan kullanıcıya rezervasyon bildirimi göndermek,
        // tıklayınca yetkisi olmayan bir sayfaya götürmek olurdu.
        moduller: { has: "rezervasyon" },
      },
      select: { id: true },
    });
    if (kullanicilar.length === 0) return;

    const saat = girdi.baslangic.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    await bildirimGonder(
      kullanicilar.map((k) => k.id),
      {
        tur: "rezervasyon.talep",
        baslik: `Yeni rezervasyon talebi — ${girdi.mekanAdi}`,
        govde: `${girdi.misafirAdi} · ${girdi.kisiSayisi} kişi · ${saat}. Onayınızı bekliyor.`,
        url: "/admin/rezervasyon",
      },
    );
  } catch (error) {
    console.error("[rezervasyon] talep bildirimi gönderilemedi:", error);
  }
}
