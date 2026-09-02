import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiHata, govdeOku } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Biyerlere tarafındaki mekan görüntüleme/yol tarifi tıklamasını sayar —
 * panelin "Biyerlere bu hafta" istatistik kartının ham verisi.
 *
 * Kimlik GEREKTİRMİYOR: SurveyView (panelin anket görüntüleme sayacı) ile
 * aynı prensip — ölçüm, kim olduğunu bilmeyi değil yalnızca "kaç kez"
 * sorusunu cevaplamayı gerektiriyor. Anonim bırakmak, sayaç uğruna kimlik
 * toplamaktan daha az veri demek.
 */
export async function POST(request: Request) {
  const govde = await govdeOku(request);
  const businessId = typeof govde?.businessId === "string" ? govde.businessId : "";
  const tur = govde?.tur === "yolTarifi" ? "yolTarifi" : "goruntuleme";
  if (!businessId) return apiHata("Mekan bilgisi eksik.", 400);

  // Var olmayan bir işletmeye kayıt açmamak için sessizce doğrula; hata
  // dönmüyoruz çünkü bu uç `sendBeacon` ile çağrılıyor, yanıtı kimse okumaz.
  const mekan = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (mekan) {
    await prisma.mekanEtkilesim.create({ data: { businessId, tur } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
