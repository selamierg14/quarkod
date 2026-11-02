import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { prisma } from "@/lib/cekirdek/db";
import { EmptyState, buttonClass } from "@/components/ui";

/** Dönemde gösterilecek veri yokken: son veri ne zaman, nasıl genişletilir. */
export const VARSAYILAN_DONEM_GUN = 30;

/**
 * Seçili dönemde veri yokken gösterilen boş durum.
 *
 * QA: Vardiya & masa, Ürünler ve Performans varsayılanda boş açılıyordu;
 * veri 90 günde vardı ama sayfa bunu söylemiyordu, kullanıcı "çalışmıyor"
 * sanıyordu. Burada son kaydın tarihi yazıyor ve tek tıkla dönemi o
 * kaydı kapsayacak kadar genişleten bir düğme var.
 */
export async function DonemBos({
  businessIds,
  gun,
  taban,
  donemler,
  baslik = "Bu dönemde veri yok",
}: {
  businessIds: string[];
  gun: number;
  /** Sayfanın adresi; mevcut parametreler korunarak `gun` değiştirilir. */
  taban: string;
  donemler: number[];
  baslik?: string;
}) {
  const son = await prisma.feedback.findFirst({
    where: { businessId: { in: businessIds } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!son) {
    return <EmptyState baslik="Henüz geri bildirim yok">İlk geri bildirim geldiğinde burada görünecek.</EmptyState>;
  }

  const kacGunOnce = Math.ceil((new Date().getTime() - son.createdAt.getTime()) / 86_400_000);
  const kapsayan = donemler.filter((d) => d > gun).find((d) => d >= kacGunOnce);
  const ayrac = taban.includes("?") ? "&" : "?";

  return (
    <EmptyState
      baslik={baslik}
      ikon={<CalendarSearch className="h-5 w-5" aria-hidden="true" />}
      aksiyon={
        kapsayan ? (
          <Link href={`${taban}${ayrac}gun=${kapsayan}`} className={buttonClass({ size: "sm" })}>
            Son {kapsayan === 365 ? "1 yıla" : `${kapsayan} güne`} genişlet
          </Link>
        ) : null
      }
    >
      Son {gun} günde kayıt yok. En son veri{" "}
      {son.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinde
      geldi.
    </EmptyState>
  );
}
