import { NextResponse, type NextRequest } from "next/server";
import { canAccessBusiness, getSession } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { toCsv } from "@/lib/isletme/feedback-filters";
import { SHIFTS, type Shift } from "@/lib/cekirdek/constants";
import { gunBaslangici, gunEkle, gunGirdisindenTarih } from "@/lib/cekirdek/gun";
import { DURUM_METNI, gunlukTablo, sureMetni } from "@/lib/personel/mesai";

/**
 * Mesai raporunun CSV çıktısı — bordro için.
 *
 * Eksik kayıtlar ÇIKTIYA DA GİRİYOR ("Giriş yapmadı" / "Çıkış yapmadı"
 * satırı, süre sütunu boş). Eksikleri gizleyip yalnızca tamamlananları
 * vermek, bordroyu hazırlayan kişiye eksiksiz bir ay görüntüsü sunardı;
 * oysa görmesi gereken tam olarak o boşluklar.
 *
 * Server Action değil ayrı bir route: dosya doğrudan indirilebilir
 * olmalı (aynı gerekçe: geri-bildirimler/disa-aktar).
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  // Aynı kalıp: geri-bildirimler/disa-aktar. Oturumdaki modül listesi
  // getSession'da zaten hesaplanıyor (superadmin hepsine sahip sayılır).
  if (!user.moduller.includes("mesai")) {
    return NextResponse.json({ error: "Bu modüle erişim izniniz yok." }, { status: 403 });
  }

  const businessId = request.nextUrl.searchParams.get("isletme") ?? "";
  if (!(await canAccessBusiness(user, businessId))) {
    return NextResponse.json({ error: "Bu işletmeye yetkiniz yok." }, { status: 403 });
  }

  const tarihHam = request.nextUrl.searchParams.get("tarih") ?? "";
  const gecerliTarih = /^\d{4}-\d{2}-\d{2}$/.test(tarihHam);
  const gunBasi = gunBaslangici(gecerliTarih ? gunGirdisindenTarih(tarihHam) : new Date());
  // Tek gün yerine o günden başlayan bir gün: ekrandaki tabloyla birebir
  // aynı veriyi vermek, "rapor neden tutmuyor" sorusunu doğurmasın.
  const gunSonu = gunEkle(gunBasi, 1);

  const [kayitlar, atamalar, isletme] = await Promise.all([
    prisma.mesaiKaydi.findMany({
      where: { businessId, giris: { gte: gunBasi, lt: gunSonu } },
      orderBy: { giris: "asc" },
      select: { id: true, userId: true, giris: true, cikis: true, user: { select: { name: true } } },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId, date: { gte: gunBasi, lt: gunSonu } },
      select: { userId: true, shift: true, user: { select: { name: true } } },
    }),
    prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } }),
  ]);

  const satirlar = gunlukTablo({
    kayitlar: kayitlar.map((k) => ({
      id: k.id,
      userId: k.userId,
      giris: k.giris,
      cikis: k.cikis,
      ad: k.user.name,
    })),
    planlananlar: atamalar.map((a) => ({ userId: a.userId, ad: a.user.name, vardiya: a.shift })),
    gunBitti: gunSonu <= new Date(),
  });

  const saat = (t: Date | null) =>
    t ? t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";

  const rows: string[][] = [
    ["Tarih", "Personel", "Planlı vardiya", "İlk giriş", "Son çıkış", "Toplam", "Dakika", "Durum"],
    ...satirlar.map((s) => [
      gunBasi.toLocaleDateString("tr-TR"),
      s.ad,
      s.vardiya ? (SHIFTS[s.vardiya as Shift] ?? s.vardiya) : "",
      saat(s.ilkGiris),
      saat(s.sonCikis),
      s.toplamDakika === null ? "" : sureMetni(s.toplamDakika),
      s.toplamDakika === null ? "" : String(s.toplamDakika),
      DURUM_METNI[s.durum],
    ]),
  ];

  const damga = gunBasi.toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mesai-${isletme?.slug ?? "rapor"}-${damga}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
