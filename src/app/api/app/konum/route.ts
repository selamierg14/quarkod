import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gecerliKoordinatMi } from "@/lib/mekan";
import { apiHata, appKullaniciGerekli, govdeOku } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Kullanıcının SON BİLİNEN konumunu günceller.
 *
 * Yalnızca bölgesel push hedeflemesi için (bkz. lib/push.ts). Sürekli
 * bir konum takibi DEĞİL: istemci bu ucu yalnızca kullanıcı zaten konum
 * izni vermişken ve zaten konum okunan bir ekranda (Keşfet/Harita)
 * çağırıyor — ayrı bir arka plan takibi yok.
 *
 * Kaydı yalnızca AKTİF push aboneliği olan kullanıcı için tutmak da bir
 * seçenekti; ancak izin sırası tersine dönebiliyor (önce konum, sonra
 * bildirim). Bunun yerine bildirim aboneliği kapatıldığında konumun
 * OKUNMAMASI garanti ediliyor (bkz. flasIndirim'deki sorgu:
 * disabledAt: null koşulu).
 */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  const enlem = Number(govde.enlem);
  const boylam = Number(govde.boylam);
  if (!gecerliKoordinatMi(enlem, boylam)) return apiHata("Geçersiz koordinat.", 400);

  await prisma.appUser.update({
    where: { id: oturum.kullanici.id },
    data: {
      sonBilinenEnlem: enlem,
      sonBilinenBoylam: boylam,
      sonKonumGuncelleme: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
