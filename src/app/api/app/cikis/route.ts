import { NextResponse } from "next/server";
import { apiHata, bearerJetonuOku } from "@/lib/kimlik/app-api";
import { appJetonCoz } from "@/lib/kimlik/app-oturum";
import { jetonIptalEt } from "@/lib/kimlik/jeton-iptal";

export const dynamic = "force-dynamic";

/**
 * ÇIKIŞ — jetonu sunucuda iptal eder.
 *
 * Bu uç yokken çıkış yalnızca telefondaki jetonu siliyordu. Jeton imzalı
 * ve durumsuz olduğu için sunucu onu 30 gün boyunca kabul etmeye devam
 * ediyordu: ele geçirilmiş bir kopya (yedekten, günlükten, paylaşılan
 * cihazdan) çıkıştan sonra da çalışıyordu — canlı doğrulandı.
 *
 * `appKullaniciGerekli` KULLANILMIYOR: askıya alınmış ya da şifresi
 * değişmiş bir hesabın jetonu da çıkışta iptal edilebilmeli. İmza ve süre
 * geçerliyse yeter; iptal etmek kimseye yetki vermiyor.
 *
 * İstemci bu ucun sonucunu BEKLEMEMELİ: çevrimdışıyken çıkış yine de
 * yerelde tamamlanmalı. Sunucuya ulaşılamazsa jeton kendi süresiyle ölür.
 */
export async function POST(request: Request) {
  const ham = bearerJetonuOku(request);
  if (!ham) return apiHata("Oturum geçersiz.", 401);

  const jeton = await appJetonCoz(ham);
  // Zaten geçersiz bir jetonla çıkış: yapılacak bir şey yok, hata da değil.
  if (!jeton) return NextResponse.json({ cikis: true });

  await jetonIptalEt(jeton.jti, jeton.expiresAt);
  return NextResponse.json({ cikis: true });
}
