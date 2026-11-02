import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { eksikZorunluAnahtarlar } from "@/lib/cekirdek/ortam";

export const dynamic = "force-dynamic";

/**
 * Dışarıdan sorgulanabilen sağlık ucu.
 *
 * Panelde bir "Sistem sağlığı" ekranı var ama o GİRİŞ İSTİYOR — yani
 * uptime izleme servisleri (UptimeRobot, BetterStack, Vercel'in kendi
 * kontrolü) oraya bakamıyor. Sonuç: "uygulama ayakta ama veritabanı
 * düşmüş" durumunu kimse fark etmiyordu; ilk haber veren müşteri oluyordu.
 *
 * NE DÖNDÜRÜYOR, NE DÖNDÜRMÜYOR. Bu uç kimlik istemiyor, dolayısıyla
 * içeriği bir saldırgana bilgi vermemeli: sürüm numarası, bağlantı dizesi,
 * hata yığını, tablo adları YOK. Yalnızca "çalışıyor mu" sorusunun cevabı
 * ve hangi bileşenin düştüğü. Eksik ortam değişkenlerinin ADLARI da
 * verilmiyor, yalnızca SAYISI — "AUTH_SECRET eksik" bilgisi saldırgan için
 * doğrudan bir ipucu olurdu.
 *
 * Sağlıksızken 503 dönüyor: izleme servisleri gövdeyi değil durum kodunu
 * okuyor, 200 döndürüp gövdeye "hata" yazmak alarm üretmez.
 */
export async function GET() {
  const baslangic = Date.now();

  // En ucuz gerçek kontrol: bağlantı açılıyor ve sorgu dönüyor mu.
  // `count` yerine `SELECT 1`: tablo boyutundan bağımsız, sabit maliyet.
  let veritabani: "ok" | "hata" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    veritabani = "hata";
  }

  const eksikAyar = eksikZorunluAnahtarlar().length;
  const saglikli = veritabani === "ok" && eksikAyar === 0;

  return NextResponse.json(
    {
      durum: saglikli ? "saglikli" : "sorunlu",
      veritabani,
      eksikAyarSayisi: eksikAyar,
      gecikmeMs: Date.now() - baslangic,
    },
    {
      status: saglikli ? 200 : 503,
      // Ara katmanlar bu yanıtı önbelleğe alırsa kontrol anlamını yitirir.
      headers: { "Cache-Control": "no-store" },
    },
  );
}
