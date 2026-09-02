import { NextResponse } from "next/server";
import { mekanDetayGetir } from "@/lib/kesfet-veri";

export const dynamic = "force-dynamic";

/**
 * Tek mekanın detayı: kapak, etkinlik takvimi, canlı menü ve %100
 * doğrulanmış masa yorumları.
 *
 * Listeden (../route.ts) ayrı bir uç olmasının sebebi hacim: menü onlarca
 * ürün taşıyor ve bunu liste yanıtına koymak, kullanıcı hiç açmayacağı
 * kırk mekanın menüsünü de indirmesi demekti. Mobil taraf listeyi
 * gösteriyor, kullanıcı bir karta dokununca burayı çağırıyor.
 *
 * Veri çekme lib/kesfet-veri.ts'te — Biyerlere'nin `/mekan/[slug]` sayfası
 * AYNI fonksiyonu doğrudan çağırıyor, tek kaynak orada.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const mekan = await mekanDetayGetir(slug);

  if (!mekan) {
    return NextResponse.json({ hata: "Mekan bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ mekan });
}
