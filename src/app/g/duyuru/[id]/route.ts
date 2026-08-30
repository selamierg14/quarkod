import { prisma } from "@/lib/db";
import { dataUrlCoz, gorselSurumu } from "@/lib/gorsel-adres";

/**
 * Duyuru/etkinlik afişi.
 *
 * İşletme logosu/kapağıyla (bkz. g/[isletme]/[tur]) aynı gerekçe: afişler
 * data URI olarak saklanıyor ve gömüldükleri yerde her seferinde yeniden
 * iniyorlar. Biyerlere keşfet listesinde bu, tek mekanlık bir yanıtı
 * 164 KB yapıyordu.
 *
 * Yol `/g/duyuru/...`: statik "duyuru" parçası, komşu `/g/[isletme]/[tur]`
 * rotasının dinamik parçasını gölgeliyor. İşletme kimlikleri cuid olduğu
 * için "duyuru" adında bir işletme kimliği oluşamaz, çakışma riski yok.
 *
 * Kimlik doğrulaması yok — afiş zaten herkese açık karekod sayfasında ve
 * keşfet listesinde gösteriliyor.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const duyuru = await prisma.duyuru.findUnique({
    where: { id },
    select: { imageUrl: true },
  });
  if (!duyuru?.imageUrl) return new Response("Bulunamadı", { status: 404 });

  const cozum = dataUrlCoz(duyuru.imageUrl);
  if (!cozum) return new Response("Bulunamadı", { status: 404 });

  const surum = gorselSurumu(duyuru.imageUrl);
  const etag = `"${surum}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  // Adres içerik özetini taşıyorsa uzun önbellek güvenli: afiş değişince
  // adres de değişir. Özet uyuşmuyorsa eski bir bağlantıdır; kısa tutup
  // doğrulamaya bırakıyoruz.
  const guncelAdres = new URL(request.url).searchParams.get("s") === surum;

  return new Response(new Uint8Array(cozum.baytlar), {
    headers: {
      "Content-Type": cozum.tip,
      "Content-Length": String(cozum.baytlar.byteLength),
      "Cache-Control": guncelAdres
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
      ETag: etag,
    },
  });
}
