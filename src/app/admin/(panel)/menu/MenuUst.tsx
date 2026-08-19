import Link from "next/link";
import { TabLink } from "@/components/ui";

/** Düzenle/Listele sekmesi — sol menüdeki QR Menü altLinkler'iyle birebir. */
export function MenuSekmeleri({ aktif }: { aktif: "duzenle" | "liste" }) {
  return (
    <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
      <TabLink href="/admin/menu" active={aktif === "duzenle"}>
        Düzenle
      </TabLink>
      <TabLink href="/admin/menu/onizle" active={aktif === "liste"}>
        Listele
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
    <div className="flex flex-wrap gap-1">
      {businesses.map((b) => (
        <Link
          key={b.id}
          href={`${taban}?isletme=${b.id}`}
          className={`rounded-chip px-3 py-1.5 text-small ${
            b.id === seciliId
              ? "bg-ink text-white"
              : "bg-surface text-ink-soft ring-1 ring-line hover:bg-canvas"
          }`}
        >
          {b.name}
        </Link>
      ))}
    </div>
  );
}
