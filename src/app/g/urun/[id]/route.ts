import { prisma } from "@/lib/db";
import { dataUrlCoz, gorselSurumu } from "@/lib/gorsel-adres";

/**
 * Menü ürünü fotoğrafı.
 *
 * Logo/kapak (g/[isletme]/[tur]) ve afiş (g/duyuru/[id]) ile aynı desen ve
 * aynı gerekçe: fotoğraf data URI olarak saklanıyor, gömüldüğü yerde her
 * seferinde yeniden iniyor. Menüde onlarca ürün olabildiği için burada
 * fark en büyüğü — 55 ürünlük bir menü, fotoğraflar gömülü olsa
 * megabaytlarca yanıt üretirdi.
 *
 * Statik "urun" parçası komşu `/g/[isletme]/[tur]` rotasının dinamik
 * parçasını gölgeliyor; işletme kimlikleri cuid olduğu için çakışmaz.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const urun = await prisma.menuItem.findUnique({
    where: { id },
    select: { imageUrl: true },
  });
  if (!urun?.imageUrl) return new Response("Bulunamadı", { status: 404 });

  const cozum = dataUrlCoz(urun.imageUrl);
  if (!cozum) return new Response("Bulunamadı", { status: 404 });

  const surum = gorselSurumu(urun.imageUrl);
  const etag = `"${surum}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

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
