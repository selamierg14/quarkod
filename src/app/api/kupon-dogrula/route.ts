import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessBusiness, getSession } from "@/lib/auth";
import { kuponKoduGecerliMi } from "@/lib/kupon-kod";

export const dynamic = "force-dynamic";

/**
 * Kasada müşterinin gösterdiği kuponu doğrular ve yakar.
 *
 * Bu uç PANEL tarafına ait: çağıran garson/işletme sorumlusu, tüketici
 * değil. Bu yüzden kimlik panel oturumundan (çerez) okunuyor, Biyerlere
 * jetonundan değil — iki dünya birbirine karışmasın (bkz. lib/app-oturum.ts).
 *
 * Akış: müşteri cüzdanındaki 8 haneli kodu gösteriyor, personel panelden
 * giriyor. Kod kuponun kimliğinden ve zaman penceresinden türetildiği için
 * ekran görüntüsü en fazla 15-30 dakika yaşıyor.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ hata: "Oturum gerekli." }, { status: 401 });
  }

  let govde: { kuponId?: unknown; kod?: unknown };
  try {
    govde = await request.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const kuponId = typeof govde.kuponId === "string" ? govde.kuponId : "";
  const kod = typeof govde.kod === "string" ? govde.kod : "";
  if (!kuponId || !kod) {
    return NextResponse.json({ hata: "Kupon ve kod gerekli." }, { status: 400 });
  }

  const kupon = await prisma.coupon.findUnique({
    where: { id: kuponId },
    select: {
      id: true,
      businessId: true,
      discount: true,
      used: true,
      expiresAt: true,
      appUser: { select: { name: true } },
    },
  });
  if (!kupon) {
    return NextResponse.json({ hata: "Kupon bulunamadı." }, { status: 404 });
  }

  // Kiracı sınırı: bir kafenin personeli başka kafenin kuponunu yakamaz.
  if (!(await canAccessBusiness(user, kupon.businessId))) {
    return NextResponse.json({ hata: "Bu kupona yetkiniz yok." }, { status: 403 });
  }

  if (kupon.used) {
    return NextResponse.json(
      { hata: "Bu kupon daha önce kullanılmış." },
      { status: 409 },
    );
  }
  if (kupon.expiresAt && kupon.expiresAt <= new Date()) {
    return NextResponse.json({ hata: "Kuponun süresi dolmuş." }, { status: 409 });
  }
  if (!kuponKoduGecerliMi(kupon.id, kod)) {
    // Kodun neresinin yanlış olduğu söylenmiyor; ayrıca doğrulama sabit
    // sürede yapılıyor (bkz. kuponKoduGecerliMi).
    return NextResponse.json(
      { hata: "Kod geçersiz ya da süresi dolmuş. Müşteriden kodu yenilemesini isteyin." },
      { status: 409 },
    );
  }

  // updateMany + used:false koşulu: iki kasa aynı anda aynı kuponu
  // yakmaya çalışırsa yalnızca biri başarılı olsun.
  const sonuc = await prisma.coupon.updateMany({
    where: { id: kupon.id, used: false },
    data: { used: true, usedAt: new Date(), usedByUserId: user.id },
  });
  if (sonuc.count === 0) {
    return NextResponse.json(
      { hata: "Bu kupon az önce kullanıldı." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    kabul: true,
    indirim: kupon.discount,
    musteri: kupon.appUser?.name ?? null,
  });
}
