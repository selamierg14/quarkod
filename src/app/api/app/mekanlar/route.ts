import { NextResponse, type NextRequest } from "next/server";
import { sorguCoz } from "@/lib/kesfet";
import { mekanlariGetir } from "@/lib/kesfet-veri";

export const dynamic = "force-dynamic";

/**
 * Biyerlere keşfet listesi: haritadaki pinler ve akıştaki mekan kartları.
 *
 * KİMLİK GEREKTİRMİYOR. Uygulamayı ilk açan kişi, hesap açmadan önce
 * çevresinde ne olduğunu görebilmeli; giriş duvarı ardındaki bir keşif
 * ekranı kimseyi kaydolmaya ikna etmez. Dönen veri zaten kamuya açık bir
 * rehber bilgisi (ad, adres, menü fiyatı) — müşteri masada QR okutunca
 * da aynısını görüyor.
 *
 * Sorgu çözme ve süzme kuralları lib/kesfet.ts'te, veri çekme lib/kesfet-
 * veri.ts'te: Biyerlere'nin kendi sayfaları (src/app/(biyerlere)/kesfet)
 * AYNI fonksiyonları doğrudan çağırıyor, bu uca kendi kendine istek
 * atmıyor — tek kaynak burada, bu dosya yalnızca HTTP'ye sarıyor.
 */
export async function GET(request: NextRequest) {
  const sorgu = sorguCoz(request.nextUrl.searchParams);
  const sonuc = await mekanlariGetir(sorgu);
  return NextResponse.json(sonuc);
}
