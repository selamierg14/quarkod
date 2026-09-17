import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/kimlik/app-api";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";

export const dynamic = "force-dynamic";

/**
 * HESABI KALICI OLARAK SİLME.
 *
 * İki sebeple zorunlu:
 *
 *   - Apple (5.1.1.v) ve Google Play, uygulama içinden hesap açılabiliyorsa
 *     uygulama içinden silinebilmesini de şart koşuyor. Bu uç olmadan
 *     mağaza incelemesi reddediyor.
 *   - KVKK'nın silme hakkı: kişi verisinin tutulma sebebi ortadan
 *     kalktığında (kullanıcı "artık istemiyorum" dediğinde) silinmesi.
 *
 * NE GİDİYOR, NE KALIYOR. `AppUser` silinince ona bağlı her şey veritabanı
 * düzeyinde (onDelete: Cascade) gidiyor: ziyaretler, rozetler, favoriler,
 * açtığı buluşmalar, ilgi işaretleri, push abonelikleri, SMS kodları.
 * Ziyaretler de kişisel veri — bir kişinin hangi gün hangi mekanda
 * olduğunu söylüyor — ve kalmaları silme hakkıyla bağdaşmıyor.
 *
 * Doldurduğu ANKETLER kalıyor ama kimliksiz (onDelete: SetNull): anket
 * işletmenin verisi, müşterinin değil. Yorumun metni işletmenin kalite
 * kaydında duruyor, altındaki isim bağı kopuyor.
 *
 * MEVCUT ŞİFRE İSTENİYOR. Geri alınamayan tek işlem bu; açık bırakılmış
 * bir telefonu eline geçiren kişinin tek dokunuşla bir hesabı — puanları,
 * rozetleri, geçmişiyle — yok etmesi mümkün olmamalı.
 */
export async function DELETE(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const sifre = alanDogrula(metin(govde, "mevcutSifre"), "girisSifresi", "Şifre", {
    zorunlu: true,
  });
  if (!sifre.ok) return apiHata("Şifre hatalı.", 400);

  // Şifre deneme hızı sınırlı: çalınmış bir oturumla şifreyi bu uçtan
  // tahmin ederek aramak mümkün olmasın.
  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, `hesap-sil:${oturum.kullanici.id}`);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const hesap = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: { passwordHash: true },
  });
  if (!hesap) return apiHata("Hesap bulunamadı.", 404);

  if (!(await bcrypt.compare(sifre.deger, hesap.passwordHash))) {
    return apiHata("Şifre hatalı.", 400);
  }

  /**
   * `deleteMany`, `delete` değil: iki cihazdan aynı anda basıldığında
   * ikinci istek "kayıt yok" istisnasıyla 500'e düşmesin, sessizce 0
   * satır silsin. Kullanıcının istediği sonuç ikisinde de aynı.
   */
  await prisma.appUser.deleteMany({ where: { id: oturum.kullanici.id } });

  return NextResponse.json({ silindi: true });
}
