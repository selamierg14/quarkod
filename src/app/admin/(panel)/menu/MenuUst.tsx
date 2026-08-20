import Link from "next/link";
import { TabLink } from "@/components/ui";

/**
 * QR Menü modülünün üç görünümü.
 *
 * "Düzenle / Listele" adları neyin ne olduğunu anlatmıyordu; şablonlar da
 * düzenleme ekranının içine sıkışmıştı. Artık her sekme tek bir işi
 * karşılıyor ve adı ne yaptığını söylüyor.
 */
export function MenuSekmeleri({
  aktif,
}: {
  aktif: "duzenle" | "sablonlar" | "gorunum";
}) {
  return (
    <div className="print-hidden flex gap-1 overflow-x-auto border-b border-line">
      <TabLink href="/admin/menu" active={aktif === "duzenle"}>
        Menümü düzenle
      </TabLink>
      <TabLink href="/admin/menu/sablonlar" active={aktif === "sablonlar"}>
        Hazır şablonlar
      </TabLink>
      <TabLink href="/admin/menu/onizle" active={aktif === "gorunum"}>
        Menü görünümüm
      </TabLink>
    </div>
  );
}

/** Birden fazla işletmesi olan hesapta hangi menüye bakıldığını seçer. */
export function IsletmeSecici({
  businesses,
  seciliId,
  taban,
}: {
  businesses: { id: string; name: string }[];
  seciliId: string;
  taban: string;
}) {
  if (businesses.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption font-medium text-ink-muted">İşletme:</span>
      <div className="flex flex-wrap gap-1.5">
        {businesses.map((b) => (
          <Link
            key={b.id}
            href={`${taban}?isletme=${b.id}`}
            className={`rounded-chip px-3 py-1.5 text-small font-medium transition ${
              b.id === seciliId
                ? "bg-accent-600 text-white shadow-sm"
                : "bg-surface text-ink-soft ring-1 ring-line hover:bg-canvas hover:ring-line-strong"
            }`}
          >
            {b.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
