import { NextResponse, type NextRequest } from "next/server";
import { sorguCoz } from "@/lib/biyerlere/kesfet";
import { mekanlariGetir } from "@/lib/biyerlere/kesfet-veri";

export const dynamic = "force-dynamic";

/**
 * KENAR ÖNBELLEĞİ — kimliksiz, en pahalı okuma ucu için.
 *
 * Bu uç kimlik istemiyor ve her çağrıda 200 satırlık bir sorgu + puan
 * gruplaması çalıştırıyor; hız sınırı YOK, çünkü DB tabanlı bir sayaç her
 * okumaya bir yazma eklerdi. Sonuç: tek bir betik bu ucu döngüye alarak
 * veritabanını meşgul edebiliyordu.
 *
 * Yanıt kişiye özel değil (jeton okunmuyor), yani CDN'de paylaşılabilir.
 * 30 saniye taze + 2 dakika bayat-ama-sunulabilir: yağdırılan istekler
 * kenarda karşılanıyor, veritabanına dakikada birkaç tane iniyor. "Şu an
 * açık" bilgisinin en fazla ~30 sn gecikmesi kabul edilebilir.
 */
const HERKESE_ACIK_ONBELLEK = "public, s-maxage=30, stale-while-revalidate=120";

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
  return NextResponse.json(sonuc, { headers: { "Cache-Control": HERKESE_ACIK_ONBELLEK } });
}
