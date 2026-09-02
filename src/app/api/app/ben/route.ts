import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appKullaniciGerekli } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Oturumdaki tüketicinin kendi bilgisi.
 *
 * Mobil uygulama açılışta bunu çağırıp jetonunun hâlâ geçerli olup
 * olmadığını anlıyor: 401 dönerse kullanıcıyı giriş ekranına atıyor.
 * Jetonun süresi dolmamış olsa bile hesap askıya alınmış ya da şifre
 * değişmiş olabilir — bu uç ikisini de yakalar.
 *
 * `cuzdandakiKupon` bilerek buraya da eklendi: Header'daki zil rozeti bu
 * sayıyı gösteriyor ve her sayfada (bu uç açılışta zaten çağrılıyor)
 * güncel kalması gerekiyor — ayrıca /api/app/cuzdan'ı tam listesiyle
 * çağırmak bu tek sayı için gereksiz ağırdı.
 */
export async function GET(request: Request) {
  const sonuc = await appKullaniciGerekli(request);
  if ("yanit" in sonuc) return sonuc.yanit;

  const cuzdandakiKupon = await prisma.coupon.count({
    where: {
      appUserId: sonuc.kullanici.id,
      used: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  return NextResponse.json({
    kullanici: { ...sonuc.kullanici, cuzdandakiKupon },
  });
}
