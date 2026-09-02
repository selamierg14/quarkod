import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appKullaniciOku } from "@/lib/app-api";
import { rotalariGetir } from "@/lib/rota-veri";

export const dynamic = "force-dynamic";

/**
 * Rota listesi — kimlik GEREKTİRMİYOR (rotalar herkese açık, keşfedilebilir
 * içerik) ama jeton varsa ilerleme de ekleniyor. `appKullaniciOku` (401
 * döndüren `appKullaniciGerekli`'nin aksine) jetonsuzken sessizce null
 * dönüyor — bu yüzden burada o kullanılıyor.
 */
export async function GET(request: Request) {
  const [rotalar, kullanici] = await Promise.all([
    rotalariGetir(),
    appKullaniciOku(request),
  ]);

  if (!kullanici) {
    return NextResponse.json({
      rotalar: rotalar.map((r) => ({ ...r, ziyaretEdilenler: [], tamamlandiMi: false })),
    });
  }

  const ziyaretEdilenler = new Set(
    (
      await prisma.appVisit.findMany({
        where: { appUserId: kullanici.id },
        select: { businessId: true },
        distinct: ["businessId"],
      })
    ).map((v) => v.businessId),
  );
  const tamamlanmisRotaIdleri = new Set(
    (
      await prisma.rotaTamamlama.findMany({
        where: { appUserId: kullanici.id, rotaId: { in: rotalar.map((r) => r.id) } },
        select: { rotaId: true },
      })
    ).map((t) => t.rotaId),
  );

  return NextResponse.json({
    rotalar: rotalar.map((r) => ({
      ...r,
      ziyaretEdilenler: r.duraklar.filter((d) => ziyaretEdilenler.has(d.businessId)).map((d) => d.businessId),
      tamamlandiMi: tamamlanmisRotaIdleri.has(r.id),
    })),
  });
}
