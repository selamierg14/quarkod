import { prisma } from "@/lib/db";
import { dataUrlCoz, gorselSurumu, type GorselTuru } from "@/lib/gorsel-adres";

/**
 * İşletme logosu ve kapak görseli.
 *
 * Bu uç olmadan görseller data URI olarak HTML'in içine gömülüyordu; müşteri
 * karekodu her okuttuğunda aynı 110 KB yeniden iniyordu (bkz.
 * src/lib/gorsel-adres.ts). Buradan verilince tarayıcı önbelleğine giriyor
 * ve ikinci okutmada hiç inmiyor.
 *
 * Kimlik doğrulaması yok, çünkü görseller zaten herkese açık karekod
 * sayfasında gösteriliyor — gizli bir şey sunmuyoruz.
 */

const TURLER: Record<GorselTuru, "logoUrl" | "coverUrl"> = {
  logo: "logoUrl",
  kapak: "coverUrl",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ isletme: string; tur: string }> },
) {
  const { isletme, tur } = await params;
  const alan = TURLER[tur as GorselTuru];
  if (!alan) return new Response("Bulunamadı", { status: 404 });

  const business = await prisma.business.findUnique({
    where: { id: isletme },
    select: { logoUrl: true, coverUrl: true },
  });
  const deger = business?.[alan];
  if (!deger) return new Response("Bulunamadı", { status: 404 });

  const cozum = dataUrlCoz(deger);
  if (!cozum) return new Response("Bulunamadı", { status: 404 });

  const surum = gorselSurumu(deger);
  const etag = `"${surum}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  // Adres içeriğin özetini taşıyorsa (?s=...) uzun önbellek güvenli: görsel
  // değişince adres de değişir. Özet uyuşmuyorsa eski bir bağlantı geldi
  // demektir; o zaman kısa tutup doğrulamaya bırakıyoruz.
  const url = new URL(request.url);
  const guncelAdres = url.searchParams.get("s") === surum;
  const cacheControl = guncelAdres
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";

  return new Response(new Uint8Array(cozum.baytlar), {
    headers: {
      "Content-Type": cozum.tip,
      "Content-Length": String(cozum.baytlar.byteLength),
      "Cache-Control": cacheControl,
      ETag: etag,
    },
  });
}
