import { TabLink } from "@/components/ui";

/**
 * Geri bildirimler, Vardiya & masa ve Ürün puanları aynı ham veriyi farklı
 * kesitlerden gösterir. Eskiden üç ayrı üst düzey sekmeydi; hangisine ne
 * zaman bakılacağı belirsizdi. Artık tek modül, üç görünüm.
 */
export function RaporSekmeleri({ aktif }: { aktif: "liste" | "vardiya" | "urunler" }) {
  return (
    <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
      <TabLink href="/admin/geri-bildirimler" active={aktif === "liste"}>
        Liste
      </TabLink>
      <TabLink href="/admin/kirilim" active={aktif === "vardiya"}>
        Vardiya &amp; masa
      </TabLink>
      <TabLink href="/admin/urunler" active={aktif === "urunler"}>
        Ürünler
      </TabLink>
    </div>
  );
}
