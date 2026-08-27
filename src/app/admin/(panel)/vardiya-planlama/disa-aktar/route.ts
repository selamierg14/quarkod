import { NextResponse, type NextRequest } from "next/server";
import { canAccessBusiness, getSession, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/feedback-filters";
import { gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { cizelgeyiTabloyaDok } from "@/lib/vardiya-tablo";
import { izinKumesiKur } from "@/lib/izin";

/**
 * Haftalık vardiya çizelgesini Excel'de açılabilir bir tablo olarak indirir.
 *
 * Aynı dosya içe aktarmaya da girdi olur (bkz. vardiya-tablo.ts round-trip
 * testi): kullanıcının en olası akışı "dışa aktar → Excel'de düzenle →
 * içe aktar".
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  // Garson kendi çizelgesini indiremez: bu ekran planlayan tarafın
  // (bkz. requirePersonelYonetimi) ve tüm ekibin verisini taşıyor.
  if (user.role === "garson" || user.role === "viewer") {
    return NextResponse.json({ error: "Bu işleme yetkiniz yok." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const businesses = await visibleBusinesses(user);
  if (businesses.length === 0) {
    return NextResponse.json({ error: "İşletme yok." }, { status: 404 });
  }

  const istenen = params.get("isletme");
  const secili =
    (istenen && businesses.find((b) => b.id === istenen)) || businesses[0];
  if (!(await canAccessBusiness(user, secili.id))) {
    return NextResponse.json({ error: "Yetkiniz yok." }, { status: 403 });
  }

  const baslangicParam = params.get("baslangic");
  const haftaBasi = haftaBaslangici(
    baslangicParam ? new Date(baslangicParam) : new Date(),
  );
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i));

  const [personel, atamalar, izinler] = await Promise.all([
    prisma.user.findMany({
      where: {
        businessId: secili.id,
        active: true,
        role: { in: ["manager", "garson"] },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId: secili.id, date: { gte: haftaBasi, lte: gunler[6] } },
      select: { userId: true, date: true, shift: true },
    }),
    // Onaylı izinler dosyada "İzinli" olarak görünsün: çizelgeyi Excel'de
    // dolduran kişi boş hücreyi "unutulmuş" sanmasın.
    prisma.leaveRequest.findMany({
      where: {
        businessId: secili.id,
        status: "onaylandi",
        baslangic: { lte: gunler[6] },
        bitis: { gte: haftaBasi },
      },
      select: { userId: true, baslangic: true, bitis: true, tur: true, status: true },
    }),
  ]);

  const tablo = cizelgeyiTabloyaDok(personel, gunler, atamalar, izinKumesiKur(izinler));
  const dosyaAdi = `vardiya-${slugla(secili.name)}-${gunGirdisi(haftaBasi)}.csv`;

  return new NextResponse(toCsv(tablo), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Dosya adı ASCII kalsın: Content-Disposition'da Türkçe karakter bozuluyor. */
function slugla(ad: string): string {
  const harfler: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ad
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (h) => harfler[h] ?? h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "isletme";
}
